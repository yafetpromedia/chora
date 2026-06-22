import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiChatMessageDto } from './dto/ai-chat.dto';
import { ReportCommentKind } from './dto/report-comment.dto';
import { StudyAssistAction } from './dto/study-assist.dto';

type StudyContext = {
  title?: string;
  subject?: string;
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('AI_API_KEY')?.trim());
  }

  getModel(): string {
    return this.config.get<string>('AI_MODEL')?.trim() || 'claude-t0';
  }

  private getBaseUrl(): string {
    const base = this.config.get<string>('AI_BASE_URL')?.trim();
    return (base || 'https://api.freemodel.dev/v1').replace(/\/$/, '');
  }

  private async complete(
    messages: ChatMessage[],
    maxTokens = 2048,
    temperature = 0.4,
  ): Promise<{ content: string; model: string }> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI is not configured on this server.',
      );
    }

    const model = this.getModel();
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException(`AI provider error (${response.status})`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadGatewayException('AI provider returned an empty response.');
    }

    return { content, model };
  }

  async studyAssist(
    action: StudyAssistAction,
    text: string,
    context: StudyContext = {},
  ): Promise<{ content: string; model: string }> {
    const trimmed = text.trim();
    const heading = [context.title, context.subject].filter(Boolean).join(' · ');
    const material = heading
      ? `Resource: ${heading}\n\n${trimmed}`
      : trimmed;

    const systemPrompt =
      'You are a helpful K-12 study assistant for Ethiopian schools using CampusOne eLibrary. ' +
      'Be accurate, age-appropriate, and concise. Use clear headings and bullet lists when helpful.';

    let userPrompt: string;
    switch (action) {
      case StudyAssistAction.SUMMARIZE:
        userPrompt =
          'Summarize the following study material for a student. ' +
          'Highlight key concepts, definitions, and takeaways in plain language.\n\n' +
          material;
        break;
      case StudyAssistAction.QUIZ:
        userPrompt =
          'Create a short practice quiz (5 questions) from the material below. ' +
          'Mix multiple-choice and short-answer. After the questions, provide an answer key.\n\n' +
          material;
        break;
      case StudyAssistAction.TRANSLATE:
        userPrompt =
          'Translate the following study material to Amharic (አማርኛ). ' +
          'Preserve educational terms; add brief English glosses in parentheses only when needed for clarity.\n\n' +
          material;
        break;
      default:
        userPrompt = material;
    }

    return this.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      2048,
      0.4,
    );
  }

  async draftAnnouncement(
    prompt: string,
    audience?: string,
  ): Promise<{ title: string; body: string; model: string }> {
    const audienceLine = audience?.trim()
      ? `Audience: ${audience.trim()}.`
      : 'Audience: school community (parents, teachers, students).';

    const result = await this.complete(
      [
        {
          role: 'system',
          content:
            'You draft school announcements for Ethiopian K-12 schools on CampusOne. ' +
            'Return ONLY valid JSON with keys "title" and "body". Title under 80 chars. ' +
            'Body is 2-4 short paragraphs, warm and clear, no markdown.',
        },
        {
          role: 'user',
          content: `${audienceLine}\n\nBrief from admin:\n${prompt.trim()}`,
        },
      ],
      1024,
      0.5,
    );

    try {
      const parsed = JSON.parse(result.content) as {
        title?: string;
        body?: string;
      };
      const title = parsed.title?.trim();
      const body = parsed.body?.trim();
      if (!title || !body) throw new Error('missing fields');
      return { title, body, model: result.model };
    } catch {
      const lines = result.content.split('\n').filter(Boolean);
      const title = lines[0]?.replace(/^title:\s*/i, '').trim() || 'School announcement';
      const body =
        lines.slice(1).join('\n').replace(/^body:\s*/i, '').trim() ||
        result.content;
      return { title, body, model: result.model };
    }
  }

  async draftReportComment(
    kind: ReportCommentKind,
    context: string,
    meta: { studentName?: string; termName?: string } = {},
  ): Promise<{ content: string; model: string }> {
    const who =
      kind === ReportCommentKind.PRINCIPAL ? 'school principal' : 'homeroom teacher';
    const label = [meta.studentName, meta.termName].filter(Boolean).join(' · ');

    return this.complete(
      [
        {
          role: 'system',
          content:
            `You write report card comments as a ${who} for an Ethiopian private school. ` +
            'Be encouraging, specific, and professional. 3-5 sentences. No salutation or signature. ' +
            'Mention effort, strengths, and one constructive next step when appropriate.',
        },
        {
          role: 'user',
          content: label
            ? `Student / term: ${label}\n\nAcademic summary:\n${context.trim()}`
            : `Academic summary:\n${context.trim()}`,
        },
      ],
      512,
      0.55,
    );
  }

  async chat(
    messages: AiChatMessageDto[],
    pageContext: string | undefined,
    userRole: string,
  ): Promise<{ content: string; model: string }> {
    const system =
      'You are CampusOne Assistant — a helpful guide for a school management platform used in Ethiopia. ' +
      `The user is signed in as: ${userRole}. ` +
      'Answer questions about attendance, results, fees, timetable, eLibrary, classwork, and portals. ' +
      'Be concise and practical. If unsure, say what to check in the app rather than inventing features.';

    const history: ChatMessage[] = [
      {
        role: 'system',
        content: pageContext?.trim()
          ? `${system}\n\nCurrent page context: ${pageContext.trim()}`
          : system,
      },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    return this.complete(history, 1536, 0.45);
  }
}
