import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, PlatformAuthUser } from '../common/auth.types';
import {
  PermissionCatalog,
  permissionMatches,
} from '../common/permissions/permission-catalog';
import { PlatformPermission } from '../common/permissions/platform-permissions';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AiRuntimeConfig,
  PlatformSettingsService,
} from '../platform/platform-settings.service';
import type { AiChatMessageDto } from './dto/ai-chat.dto';
import type { TestPlatformAiDto } from './dto/test-platform-ai.dto';
import { ReportCommentKind } from './dto/report-comment.dto';
import { StudyAssistAction } from './dto/study-assist.dto';

type StudyContext = {
  title?: string;
  subject?: string;
};

type ChatImage = {
  mimeType: string;
  data: string;
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: ChatImage[];
};

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  private envSnapshot() {
    return {
      apiKey: this.config.get<string>('AI_API_KEY'),
      model: this.config.get<string>('AI_MODEL'),
      baseUrl: this.config.get<string>('AI_BASE_URL'),
    };
  }

  async isConfigured(): Promise<boolean> {
    const runtime = await this.platformSettings.getAiRuntimeConfig(
      this.envSnapshot(),
    );
    return Boolean(runtime.apiKey);
  }

  async getStatus(): Promise<{
    configured: boolean;
    model: string | null;
    provider: string | null;
    source: 'platform' | 'env' | 'none';
  }> {
    const runtime = await this.platformSettings.getAiRuntimeConfig(
      this.envSnapshot(),
    );
    return {
      configured: Boolean(runtime.apiKey),
      model: runtime.apiKey ? runtime.model : null,
      provider: runtime.apiKey ? runtime.provider : null,
      source: runtime.source,
    };
  }

  async getModel(): Promise<string> {
    const runtime = await this.platformSettings.getAiRuntimeConfig(
      this.envSnapshot(),
    );
    return runtime.model;
  }

  private authHeaders(runtime: AiRuntimeConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${runtime.apiKey}`,
    };
    if (runtime.provider === 'gemini' && runtime.apiKey) {
      headers['x-goog-api-key'] = runtime.apiKey;
    }
    return headers;
  }

  private providerErrorMessage(
    status: number,
    detail: string,
    runtime: AiRuntimeConfig,
  ): string {
    if (status === 401 || status === 403) {
      const hint =
        runtime.provider === 'gemini'
          ? ' Check the Gemini key from Google AI Studio, clear Base URL, Save, then Test. Try gemini-2.0-flash.'
          : ' Check the API key, click Save settings, then Test again.';
      return detail
        ? `AI provider error (${status}): ${detail}.${hint}`
        : `AI provider error (${status}): invalid or unauthorized API key.${hint}`;
    }
    if (status === 404) {
      const hint =
        runtime.provider === 'gemini'
          ? ` Model “${runtime.model}” is not available for this API key. Clear Base URL, pick another Flash model, Save, then Test. Not a localhost issue.`
          : ` Model or endpoint not found (${runtime.model}).`;
      return detail
        ? `AI provider error (${status}): ${detail}.${hint}`
        : `AI provider error (${status}).${hint}`;
    }
    if (status === 429 || status === 503) {
      return detail
        ? `AI provider error (${status}): ${detail} Wait ~30s and try again, or switch to 3.1 Flash-Lite in Platform → Settings → AI.`
        : `AI provider error (${status}): Google is busy. Wait ~30s and try again, or switch to 3.1 Flash-Lite.`;
    }
    return detail
      ? `AI provider error (${status}): ${detail}`
      : `AI provider error (${status})`;
  }

  private geminiNativeBase(runtime: AiRuntimeConfig): string {
    const raw = (runtime.baseUrl || '').replace(/\/$/, '');
    // Saved OpenAI-compat URLs break native calls — normalize to v1beta.
    if (!raw || raw.includes('/openai')) {
      return 'https://generativelanguage.googleapis.com/v1beta';
    }
    return raw;
  }

  private toGeminiContents(messages: ChatMessage[]): {
    systemInstruction?: { parts: Array<{ text: string }> };
    contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>;
  } {
    const systemParts = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content.trim())
      .filter(Boolean);
    const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];
    for (const m of messages) {
      if (m.role === 'system') continue;
      const role = m.role === 'assistant' ? 'model' : 'user';
      const text = (m.content ?? '').trim();
      const images = m.images?.filter((img) => img.data && img.mimeType) ?? [];
      if (!text && images.length === 0) continue;

      const parts: GeminiPart[] = [];
      if (text) parts.push({ text });
      for (const img of images) {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data.replace(/^data:[^;]+;base64,/, ''),
          },
        });
      }

      const last = contents[contents.length - 1];
      // Only merge plain text turns — never fold image turns together.
      if (last && last.role === role && images.length === 0 && !m.images?.length) {
        const first = last.parts[0];
        if (first && 'text' in first) {
          first.text += `\n\n${text}`;
          continue;
        }
      }
      contents.push({ role, parts });
    }
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }
    // Gemini requires the first content role to be user.
    if (contents[0]?.role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: '(continue)' }] });
    }
    return {
      systemInstruction: systemParts.length
        ? { parts: [{ text: systemParts.join('\n\n') }] }
        : undefined,
      contents,
    };
  }

  private isGemini3Family(model: string): boolean {
    return /^gemini-3/i.test(model.replace(/^models\//, ''));
  }

  private async completeGeminiNative(
    runtime: AiRuntimeConfig,
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number,
    attempt = 0,
  ): Promise<{ content: string; model: string }> {
    const model = runtime.model.replace(/^models\//, '');
    const url = `${this.geminiNativeBase(runtime)}/models/${encodeURIComponent(model)}:generateContent`;
    const { systemInstruction, contents } = this.toGeminiContents(messages);
    // Thinking models count reasoning against maxOutputTokens — keep headroom.
    const outputCap = Math.max(maxTokens, this.isGemini3Family(model) ? 2048 : maxTokens);

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: outputCap,
    };
    // Gemini 3.x docs: avoid custom temperature; set low thinking so short replies aren't empty.
    if (this.isGemini3Family(model)) {
      generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    } else {
      generationConfig.temperature = temperature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': runtime.apiKey!,
      },
      body: JSON.stringify({
        ...(systemInstruction ? { systemInstruction } : {}),
        contents,
        generationConfig,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = (await response.json()) as {
          error?: { message?: string };
          message?: string;
        };
        detail = errBody.error?.message || errBody.message || '';
      } catch {
        /* ignore */
      }
      // Google often returns 404 "use models/gemini-3.8-flash" for retired IDs.
      const suggested = detail.match(
        /models\/(gemini-[a-z0-9.-]+)/i,
      )?.[1];
      if (
        response.status === 404 &&
        suggested &&
        suggested.replace(/^models\//, '') !== model
      ) {
        return this.completeGeminiNative(
          { ...runtime, model: suggested.replace(/^models\//, '') },
        messages,
          maxTokens,
          temperature,
        );
      }
      if (
        response.status === 404 &&
        /no longer available/i.test(detail) &&
        model !== 'gemini-3.8-flash'
      ) {
        return this.completeGeminiNative(
          { ...runtime, model: 'gemini-3.8-flash' },
          messages,
          maxTokens,
          temperature,
        );
      }
      // 503 / high demand — brief retry, then try a lighter Flash model once.
      if (
        (response.status === 503 || response.status === 429) &&
        attempt < 2
      ) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        return this.completeGeminiNative(
          runtime,
          messages,
          maxTokens,
          temperature,
          attempt + 1,
        );
      }
      if (
        (response.status === 503 || response.status === 429) &&
        attempt >= 2 &&
        model !== 'gemini-3.1-flash-lite'
      ) {
        return this.completeGeminiNative(
          { ...runtime, model: 'gemini-3.1-flash-lite' },
          messages,
          maxTokens,
          temperature,
          0,
        );
      }
      throw new BadGatewayException(
        this.providerErrorMessage(response.status, detail, runtime),
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const answer = parts
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text!)
      .join('')
      .trim();
    const fallback = parts
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    const content = answer || fallback;
    if (!content) {
      const why =
        candidate?.finishReason ||
        data.promptFeedback?.blockReason ||
        'no text parts';
      throw new BadGatewayException(
        `AI provider returned an empty response (${why}). Try gemini-3.8-flash and Test again.`,
      );
    }
    return { content, model };
  }

  private toOpenAiMessages(messages: ChatMessage[]) {
    return messages.map((m) => {
      const images = m.images?.filter((img) => img.data && img.mimeType) ?? [];
      if (images.length === 0) {
        return { role: m.role, content: m.content };
      }
      const parts: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      > = [];
      const text = (m.content ?? '').trim();
      if (text) parts.push({ type: 'text', text });
      for (const img of images) {
        const raw = img.data.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${raw}` },
        });
      }
      if (parts.length === 0) {
        parts.push({ type: 'text', text: 'Describe this image.' });
      }
      return { role: m.role, content: parts };
    });
  }

  private async completeOpenAiCompat(
    runtime: AiRuntimeConfig,
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number,
  ): Promise<{ content: string; model: string }> {
    const response = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.authHeaders(runtime),
      body: JSON.stringify({
        model: runtime.model,
        messages: this.toOpenAiMessages(messages),
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = (await response.json()) as {
          error?: { message?: string };
          message?: string;
        };
        detail = errBody.error?.message || errBody.message || '';
      } catch {
        /* ignore */
      }
      throw new BadGatewayException(
        this.providerErrorMessage(response.status, detail, runtime),
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadGatewayException('AI provider returned an empty response.');
    }

    return { content, model: runtime.model };
  }

  private async completeWithRuntime(
    runtime: AiRuntimeConfig,
    messages: ChatMessage[],
    maxTokens = 2048,
    temperature = 0.4,
  ): Promise<{ content: string; model: string }> {
    if (!runtime.apiKey) {
      throw new ServiceUnavailableException(
        'AI is not configured. Add a Gemini (or other) API key in Platform settings → AI, then Save.',
      );
    }

    if (runtime.provider === 'gemini') {
      return this.completeGeminiNative(
        runtime,
        messages,
        maxTokens,
        temperature,
      );
    }

    return this.completeOpenAiCompat(
      runtime,
      messages,
      maxTokens,
      temperature,
    );
  }

  private async complete(
    messages: ChatMessage[],
    maxTokens = 2048,
    temperature = 0.4,
  ): Promise<{ content: string; model: string }> {
    const runtime = await this.platformSettings.getAiRuntimeConfig(
      this.envSnapshot(),
    );
    return this.completeWithRuntime(runtime, messages, maxTokens, temperature);
  }

  /** Owner test ping from platform settings (uses form values when provided). */
  async testConnection(dto: TestPlatformAiDto = {}): Promise<{
    ok: boolean;
    model: string;
    provider: string;
    source: string;
    reply: string;
  }> {
    const formKey = dto.aiApiKey?.trim() || '';
    const saved = await this.platformSettings.getAiRuntimeConfig(
      this.envSnapshot(),
    );
    const apiKey = formKey || saved.apiKey;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'No AI API key to test. Paste your Gemini key, click Save settings, then Test connection.',
      );
    }

    // Always honor the model/provider/base URL from the form chips — even when
    // the API key field is blank (keep saved key).
    const runtime = this.platformSettings.buildAiRuntimeConfig({
      source: formKey ? 'platform' : saved.source,
      provider: dto.aiProvider || saved.provider,
      apiKey,
      model: dto.aiModel?.trim() || saved.model,
      baseUrl:
        dto.aiBaseUrl !== undefined
          ? dto.aiBaseUrl.trim() || null
          : saved.baseUrl,
    });

    const result = await this.completeWithRuntime(
      runtime,
      [
        {
          role: 'user',
          content: 'Reply with exactly: Chora AI OK',
        },
      ],
      // Gemini 3 thinking uses output budget — 32 tokens often yields an empty reply.
      runtime.provider === 'gemini' ? 1024 : 64,
      0,
    );
    return {
      ok: true,
      model: result.model,
      provider: runtime.provider,
      source: formKey ? 'form' : saved.source,
      reply: result.content,
    };
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
      'You are a helpful K-12 study assistant for Ethiopian schools using Chora eLibrary. ' +
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
            'You draft school announcements for Ethiopian K-12 schools on Chora. ' +
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
    user: AuthUser,
  ): Promise<{ content: string; model: string }> {
    const userTexts = messages
      .filter((m) => m.role === 'user')
      .map((m) => (m.content ?? '').trim())
      .filter(Boolean);
    const latestUserText = userTexts[userTexts.length - 1] ?? '';
    // Follow-ups like "again try" keep grade/topic context from earlier turns
    // (including grades mentioned in prior assistant replies).
    const conversationQuery = messages
      .slice(-10)
      .map((m) => (m.content ?? '').trim())
      .filter(Boolean)
      .join('\n');
    const [sessionContext, liveData] = await Promise.all([
      this.buildChatSessionContext(user),
      this.buildRoleAuthorizedLiveData(user, latestUserText, conversationQuery),
    ]);
    const system = [
      'You are Chora Assistant — the in-app helper for Chora, a school management platform used in Ethiopia.',
      'You already know the signed-in school, user, academics, structure, and role routes from the session facts below. Use those facts directly.',
      'When “Live school data” is present, you DO have authorized access for this signed-in role — answer from it. Never claim you lack access to records that are listed there.',
      'If a line like “Students in Grade 11: …” includes names, quote those names directly. Do not send the user to /admin/students for a name that is already listed.',
      'If a “Focused student/teacher/grade dossier” section is present, summarize from it. Do not claim you lack access to fields that are listed. If a field says “not authorized”, respect that.',
      'Never tell the user to open Settings (or guess) for school name, year, term, grades, subjects, counts, payment methods, student/teacher names, or their own class when that information is already provided.',
      'When guiding the user, point them to the exact menu path / URL from the role navigation map.',
      'Answer questions about attendance, results, report cards, fees, timetable, exams, eLibrary, classwork/worksheets, admissions, announcements, ID cards, users, and billing.',
      'Users may attach screenshots or photos — describe what you see and give practical next steps.',
      'Be concise and practical. If something is not in session facts or live data, say what is unknown instead of inventing it. Do not invent marks, fee balances, or private records that are not listed.',
      'Security rules (mandatory):',
      '- Only share facts present in session facts / live data for this signed-in user. Never invent access.',
      '- Never reveal join codes, bank/Telebirr account numbers, FAN/FCN, or portal usernames unless those fields appear in the authorized data.',
      '- Never expose another student’s or parent’s private data to a student/parent user.',
      '- Teachers may only discuss students/classes in their authorized scope.',
      '- If a domain is marked “not authorized”, say the user lacks permission — do not suggest workarounds that leak data.',
      '',
      sessionContext,
      liveData,
      pageContext?.trim() ? `Current page path: ${pageContext.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const history: ChatMessage[] = [
      { role: 'system', content: system },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          (m.content ?? '').trim() ||
          (m.images?.length ? 'Please look at the attached image(s).' : ''),
        images: m.images?.map((img) => ({
          mimeType: img.mimeType,
          data: img.data,
        })),
      })),
    ];

    return this.complete(history, 2048, 0.45);
  }

  async platformChat(
    messages: AiChatMessageDto[],
    pageContext: string | undefined,
    user: PlatformAuthUser,
  ): Promise<{ content: string; model: string }> {
    const userTexts = messages
      .filter((m) => m.role === 'user')
      .map((m) => (m.content ?? '').trim())
      .filter(Boolean);
    const latestUserText = userTexts[userTexts.length - 1] ?? '';
    const conversationQuery = messages
      .slice(-10)
      .map((m) => (m.content ?? '').trim())
      .filter(Boolean)
      .join('\n');
    const platformContext = await this.buildPlatformChatContext(
      user,
      latestUserText,
      conversationQuery,
    );
    const system = [
      'You are Chora Platform Assistant — helper for Chora platform operators (OWNER / SUPPORT / SALES).',
      'You help with tenant schools, provisioning, billing/invoices, plans, coupons, support tickets, curriculum packages, subjects, eLibrary repo, and platform settings.',
      'Use the authorized platform data below. Never invent school/tenant facts that are not listed.',
      'When guiding operators, use platform console sections (Overview, Tenants, Billing, Invoices, Support, Plans, Coupons, Settings, Permissions, etc.).',
      'Users may attach screenshots — describe what you see and give practical next steps.',
      'Be concise. Respect permission boundaries: if a domain is marked not authorized, do not invent or leak that data.',
      'Never expose school join codes, API keys, or payment secrets unless they appear in authorized data for this operator.',
      '',
      platformContext,
      pageContext?.trim()
        ? `Current platform section/path: ${pageContext.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const history: ChatMessage[] = [
      { role: 'system', content: system },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          (m.content ?? '').trim() ||
          (m.images?.length ? 'Please look at the attached image(s).' : ''),
        images: m.images?.map((img) => ({
          mimeType: img.mimeType,
          data: img.data,
        })),
      })),
    ];

    return this.complete(history, 2048, 0.45);
  }

  private platformCan(
    user: PlatformAuthUser,
    permission: string,
  ): boolean {
    if (user.role === 'OWNER') return true;
    return (user.permissions ?? []).includes(permission as never);
  }

  private async buildPlatformChatContext(
    user: PlatformAuthUser,
    latestText: string,
    conversationText: string,
  ): Promise<string> {
    const q = `${latestText}\n${conversationText}`.toLowerCase();
    const canSchools = this.platformCan(user, PlatformPermission.SCHOOLS_VIEW);
    const canBilling = this.platformCan(user, PlatformPermission.BILLING_MANAGE);
    const canSupport = this.platformCan(user, PlatformPermission.SUPPORT_MANAGE);
    const wantsSchools =
      canSchools &&
      (/\b(school|tenant|tenants|academy|trial|suspend)/i.test(q) ||
        q.trim().length < 40);
    const wantsBilling =
      canBilling && /\b(bill|invoice|plan|coupon|revenue|paid|etb|usd)\b/i.test(q);
    const wantsSupport =
      canSupport && /\b(support|ticket|inbox|issue)\b/i.test(q);

    const lines: string[] = [
      'Platform session (authoritative):',
      `- Operator: ${user.firstName} ${user.lastName}`.trim(),
      `- Email: ${user.email}`,
      `- Platform role: ${user.role}`,
      `- Permissions: ${(user.permissions ?? []).join(', ') || '(role defaults)'}`,
      '',
      'Platform console map:',
      '  - Overview, Tenants (/platform schools), Packages, Subjects, eLibrary, Messages',
      '  - Support, Structures, Assessments, Provisioning',
      '  - Billing, Invoices, Usage, Plans, Coupons, Permissions, Settings',
      '',
      `Authorized domains: schools=${canSchools}, billing=${canBilling}, support=${canSupport}`,
    ];

    if (canSchools) {
      const [total, active, suspended, trial, recent] = await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { status: 'ACTIVE' } }),
        this.prisma.school.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.subscription.count({ where: { plan: 'TRIAL' } }),
        this.prisma.school.findMany({
          take: wantsSchools ? 15 : 0,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
            subscription: {
              select: { plan: true, isActive: true },
            },
            _count: { select: { grades: true, subjects: true } },
          },
        }),
      ]);
      lines.push(
        '',
        'Tenants summary:',
        `- Schools: total ${total}, active ${active}, suspended ${suspended}, trial subscriptions ${trial}`,
      );
      if (recent.length) {
        // Resolve school by name from conversation
        const named = recent.filter(
          (s) =>
            q.includes(s.name.toLowerCase()) ||
            q.includes(s.slug.toLowerCase()),
        );
        const list = named.length ? named : recent;
        lines.push(
          `- ${named.length ? 'Matched' : 'Recent'} tenants: ${list
            .map((s) => {
              const plan = s.subscription?.plan ?? 'none';
              return `${s.name} (${s.slug}) status=${s.status} plan=${plan}${s.subscription && !s.subscription.isActive ? '/inactive' : ''} grades=${s._count.grades}`;
            })
            .join('; ')}`,
        );

        // Focused tenant dossier when a school name matches
        if (named.length === 1) {
          const focusId = named[0].id;
          const [school, userCount, studentCount] = await Promise.all([
            this.prisma.school.findFirst({
              where: { id: focusId },
              select: {
                name: true,
                slug: true,
                status: true,
                schoolType: true,
                country: true,
                email: true,
                phone: true,
                setupComplete: true,
                createdAt: true,
                subscription: {
                  select: {
                    plan: true,
                    isActive: true,
                    billingBundle: true,
                    trialEndsAt: true,
                    currentPeriodEnd: true,
                    enabledModules: true,
                  },
                },
                _count: {
                  select: {
                    grades: true,
                    subjects: true,
                  },
                },
              },
            }),
            this.prisma.user.count({ where: { schoolId: focusId } }),
            this.prisma.studentProfile.count({ where: { schoolId: focusId } }),
          ]);
          if (school) {
            const modules = Array.isArray(school.subscription?.enabledModules)
              ? (school.subscription!.enabledModules as string[])
              : [];
            lines.push(
              ...[
                '',
                `Focused tenant dossier for ${school.name}:`,
                `- Slug: ${school.slug}`,
                `- Status: ${school.status}`,
                school.schoolType ? `- Type: ${school.schoolType}` : null,
                school.country ? `- Country: ${school.country}` : null,
                school.email ? `- Email: ${school.email}` : null,
                school.phone ? `- Phone: ${school.phone}` : null,
                `- Setup complete: ${school.setupComplete ? 'yes' : 'no'}`,
                `- Created: ${school.createdAt.toISOString().slice(0, 10)}`,
                `- Users: ${userCount}; students: ${studentCount}; grades: ${school._count.grades}; subjects: ${school._count.subjects}`,
                school.subscription
                  ? `- Subscription: ${school.subscription.plan} (${school.subscription.isActive ? 'active' : 'inactive'})`
                  : '- Subscription: none',
                school.subscription?.billingBundle
                  ? `- Bundle: ${school.subscription.billingBundle}`
                  : null,
                school.subscription?.trialEndsAt
                  ? `- Trial ends: ${school.subscription.trialEndsAt.toISOString().slice(0, 10)}`
                  : null,
                school.subscription?.currentPeriodEnd
                  ? `- Period end: ${school.subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
                  : null,
                modules.length
                  ? `- Modules: ${modules.join(', ')}`
                  : school.subscription
                    ? '- Modules: all / unrestricted'
                    : null,
              ].filter((x): x is string => x != null),
            );
          }
        }
      }
    } else {
      lines.push('', 'Tenants: not authorized for this operator');
    }

    if (canBilling && (wantsBilling || wantsSchools)) {
      const [plans, openInvoices, paidInvoices] = await Promise.all([
        this.prisma.planCatalog.findMany({
          where: { isListed: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            plan: true,
            label: true,
            etbMonthly: true,
            usdMonthly: true,
            trialDays: true,
          },
        }),
        this.prisma.platformInvoice.count({
          where: { status: { in: ['DRAFT', 'SENT', 'OVERDUE'] } },
        }),
        this.prisma.platformInvoice.count({ where: { status: 'PAID' } }),
      ]);
      lines.push(
        '',
        'Billing:',
        `- Invoices: open/draft/overdue ${openInvoices}; paid ${paidInvoices}`,
        plans.length
          ? `- Plans: ${plans
              .map(
                (p) =>
                  `${p.label} (${p.plan}) ${p.etbMonthly} ETB / ${p.usdMonthly} USD${p.trialDays ? `, trial ${p.trialDays}d` : ''}`,
              )
              .join('; ')}`
          : '- Plans: none listed',
      );
    } else if (!canBilling) {
      lines.push('', 'Billing: not authorized for this operator');
    }

    if (canSupport && (wantsSupport || wantsSchools)) {
      const [open, inProgress, resolved] = await Promise.all([
        this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      ]);
      const recentTickets = await this.prisma.supportTicket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          subject: true,
          status: true,
          category: true,
          createdAt: true,
          school: { select: { name: true } },
        },
      });
      lines.push(
        '',
        'Support:',
        `- Tickets: open ${open}, in progress ${inProgress}, resolved ${resolved}`,
        recentTickets.length
          ? `- Recent open: ${recentTickets
              .map(
                (t) =>
                  `“${t.subject}” (${t.school.name}, ${t.status}, ${t.category}, ${t.createdAt.toISOString().slice(0, 10)})`,
              )
              .join('; ')}`
          : '- Recent open: none',
      );
    } else if (!canSupport) {
      lines.push('', 'Support: not authorized for this operator');
    }

    return lines.join('\n');
  }

  private canAccess(user: AuthUser, permission: string): boolean {
    if (user.role === 'admin') return true;
    return permissionMatches(user.permissions ?? [], permission);
  }

  /** Single source of truth for what Chora AI may load for this signed-in user. */
  private getAiDataAccess(user: AuthUser) {
    const can = (permission: string) => this.canAccess(user, permission);
    return {
      role: user.role,
      canReadStudents: can(PermissionCatalog.STUDENTS_READ),
      canEditStudents: can(PermissionCatalog.STUDENTS_EDIT),
      canReadTeachers: can(PermissionCatalog.TEACHERS_READ),
      canReadFinance: can(PermissionCatalog.FINANCE_READ),
      canManageFinance: can(PermissionCatalog.FINANCE_MANAGE),
      canReadAttendance:
        can(PermissionCatalog.ATTENDANCE_READ) ||
        can(PermissionCatalog.ATTENDANCE_MANAGE) ||
        user.role === 'teacher',
      canReadAttendanceSchoolWide:
        can(PermissionCatalog.ATTENDANCE_ANALYTICS) ||
        can(PermissionCatalog.ATTENDANCE_MANAGE) ||
        user.role === 'admin',
      canReadResults:
        can(PermissionCatalog.RESULTS_READ) || user.role === 'teacher',
      canReadAnnouncements: true,
      canSeeJoinCode:
        user.role === 'admin' || can(PermissionCatalog.SCHOOL_SETTINGS),
      canSeePaymentAccounts:
        user.role === 'admin' ||
        can(PermissionCatalog.FINANCE_READ) ||
        can(PermissionCatalog.FINANCE_MANAGE),
      canSeeSensitiveIds: can(PermissionCatalog.STUDENTS_READ),
      canSeePortalUsernames:
        user.role === 'admin' || can(PermissionCatalog.STUDENTS_EDIT),
      canSeeParentContacts: can(PermissionCatalog.STUDENTS_READ),
    };
  }

  private formatEtb(cents: number): string {
    return `${(cents / 100).toLocaleString('en-ET', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ETB`;
  }

  private detectQueryIntents(text: string): {
    students: boolean;
    teachers: boolean;
    fees: boolean;
    attendance: boolean;
    results: boolean;
    announcements: boolean;
    general: boolean;
  } {
    const q = text.toLowerCase();
    const students =
      /\b(student|students|learner|learners|pupil|pupils|roster|enrol+ed|class list|name of|who is|who are)\b/.test(
        q,
      ) || /\bgrade\s*\d+\b/.test(q);
    const teachers =
      /\b(teacher|teachers|staff|homeroom|instructor|instructors)\b/.test(q);
    const fees =
      /\b(fee|fees|payment|payments|tuition|balance|balances|telebirr|collected|billing|invoice)\b/.test(
        q,
      );
    const attendance =
      /\b(attendance|absent|absence|present|late|attendance)\b/.test(q);
    const results =
      /\b(result|results|score|scores|mark|marks|report\s*card|ranking|rank)\b/.test(
        q,
      );
    const announcements =
      /\b(announcement|announcements|notice|notices)\b/.test(q);
    const general =
      !students &&
      !teachers &&
      !fees &&
      !attendance &&
      !results &&
      !announcements;
    return {
      students,
      teachers,
      fees,
      attendance,
      results,
      announcements,
      general,
    };
  }

  private extractRequestedGradeNumbers(query: string): string[] {
    const q = query.toLowerCase();
    const nums = new Set<string>();
    for (const match of q.matchAll(
      /\b(?:grade|class|g)\s*[-:]?\s*(\d{1,2})\b/g,
    )) {
      nums.add(match[1]);
    }
    // Longest-first so "11" wins over bare "1" if both somehow appear.
    return [...nums].sort((a, b) => b.length - a.length || Number(b) - Number(a));
  }

  private matchGradeNames(
    query: string,
    grades: Array<{ id: string; name: string }>,
  ): Array<{ id: string; name: string }> {
    const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const requestedNums = this.extractRequestedGradeNumbers(q);

    if (requestedNums.length) {
      const byNumber = grades.filter((g) => {
        const num = g.name.match(/\d+/)?.[0];
        return num != null && requestedNums.includes(num);
      });
      if (byNumber.length) return byNumber;
    }

    // Exact / whole-phrase name match only (never substring: "grade 1" ⊂ "grade 11").
    const matched = grades.filter((g) => {
      const name = g.name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!name) return false;
      if (new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(name)}([^a-z0-9]|$)`).test(q)) {
        return true;
      }
      return false;
    });
    return matched;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async resolveFocusedStudent(
    user: AuthUser,
    conversationText: string,
    preferredGradeIds: string[],
  ): Promise<{ id: string } | null> {
    const q = conversationText.toLowerCase();
    const pronounFollowUp =
      /\b(about him|about her|about them|tell me about him|tell me about her)\b/i.test(
        conversationText,
      );

    let teacherGradeIds = preferredGradeIds;
    if (user.role === 'teacher' && !teacherGradeIds.length) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: {
          homeroomGradeId: true,
          assignments: { select: { gradeId: true } },
        },
      });
      teacherGradeIds = [
        ...new Set(
          [
            teacher?.homeroomGradeId,
            ...(teacher?.assignments.map((a) => a.gradeId) ?? []),
          ].filter(Boolean) as string[],
        ),
      ];
      if (!teacherGradeIds.length) return null;
    }

    if (user.role === 'student') {
      const me = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      return me ? { id: me.id } : null;
    }

    const scopeWhere =
      user.role === 'parent'
        ? {
            schoolId: user.schoolId,
            parents: { some: { parentId: user.id } },
          }
        : user.role === 'teacher'
          ? {
              schoolId: user.schoolId,
              status: 'ACTIVE' as const,
              gradeId: { in: teacherGradeIds },
            }
          : this.canAccess(user, PermissionCatalog.STUDENTS_READ) ||
              user.role === 'admin'
            ? {
                schoolId: user.schoolId,
                status: 'ACTIVE' as const,
              }
            : null;

    if (!scopeWhere) return null;

    const candidates = await this.prisma.studentProfile.findMany({
      where: scopeWhere,
      take: 800,
      select: {
        id: true,
        gradeId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    type Hit = { id: string; gradeId: string; index: number; full: string };
    const hits: Hit[] = [];
    for (const s of candidates) {
      const full = `${s.user.firstName} ${s.user.lastName}`
        .trim()
        .replace(/\s+/g, ' ');
      if (full.length < 3) continue;
      const idx = q.indexOf(full.toLowerCase());
      if (idx >= 0) {
        hits.push({ id: s.id, gradeId: s.gradeId, index: idx, full });
        continue;
      }
      // Also match "LAST FIRST" / loose token order when both names appear near each other
      const first = s.user.firstName.trim().toLowerCase();
      const last = s.user.lastName.trim().toLowerCase();
      if (first.length >= 2 && last.length >= 2 && q.includes(first) && q.includes(last)) {
        const i1 = q.indexOf(first);
        const i2 = q.indexOf(last);
        if (Math.abs(i1 - i2) <= 40) {
          hits.push({
            id: s.id,
            gradeId: s.gradeId,
            index: Math.max(i1, i2),
            full,
          });
        }
      }
    }

    if (hits.length) {
      // Most recently mentioned name in the conversation wins
      hits.sort((a, b) => b.index - a.index);
      if (preferredGradeIds.length) {
        const inGrade = hits.find((h) => preferredGradeIds.includes(h.gradeId));
        if (inGrade) return { id: inGrade.id };
      }
      return { id: hits[0].id };
    }

    // "about him" after discussing a single student in a requested grade
    const gradeFocus =
      preferredGradeIds.length > 0 ? preferredGradeIds : teacherGradeIds;
    if (pronounFollowUp && gradeFocus.length) {
      const inGrade = candidates.filter((s) => gradeFocus.includes(s.gradeId));
      if (inGrade.length === 1) return { id: inGrade[0].id };
    }

    return null;
  }

  private async assertStudentInScope(
    user: AuthUser,
    studentProfileId: string,
  ): Promise<boolean> {
    if (user.role === 'admin' || this.canAccess(user, PermissionCatalog.STUDENTS_READ)) {
      const exists = await this.prisma.studentProfile.findFirst({
        where: { id: studentProfileId, schoolId: user.schoolId },
        select: { id: true },
      });
      return !!exists;
    }
    if (user.role === 'parent') {
      const link = await this.prisma.parentStudent.findFirst({
        where: { parentId: user.id, studentId: studentProfileId },
        select: { id: true },
      });
      return !!link;
    }
    if (user.role === 'teacher') {
      const student = await this.prisma.studentProfile.findFirst({
        where: { id: studentProfileId, schoolId: user.schoolId },
        select: { gradeId: true },
      });
      if (!student) return false;
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: {
          homeroomGradeId: true,
          assignments: { select: { gradeId: true } },
        },
      });
      const gradeIds = new Set(
        [
          teacher?.homeroomGradeId,
          ...(teacher?.assignments.map((a) => a.gradeId) ?? []),
        ].filter(Boolean) as string[],
      );
      return gradeIds.has(student.gradeId);
    }
    if (user.role === 'student') {
      const me = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      return me?.id === studentProfileId;
    }
    return false;
  }

  private async buildFocusedStudentDossier(
    user: AuthUser,
    studentProfileId: string,
  ): Promise<string[]> {
    const access = this.getAiDataAccess(user);
    if (!(await this.assertStudentInScope(user, studentProfileId))) {
      return ['- Focused student: not authorized for this record'];
    }

    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId: user.schoolId },
      select: {
        id: true,
        status: true,
        gender: true,
        middleName: true,
        dateOfBirth: true,
        phone: true,
        address: true,
        nationality: true,
        region: true,
        zone: true,
        woreda: true,
        fan: true,
        fcn: true,
        cardCode: true,
        parentsCanViewResults: true,
        grade: { select: { name: true } },
        section: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            username: true,
          },
        },
        parents: {
          take: 5,
          select: {
            parent: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    if (!profile) return [];

    const fullName = `${profile.user.firstName} ${profile.user.lastName}`.trim();
    const isOwnChildOrSelf =
      user.role === 'parent' || user.role === 'student';
    const lines: string[] = [
      `Focused student dossier for ${fullName} (authorized for ${user.role} — use these details):`,
      `- Name: ${fullName}${profile.middleName ? ` (middle: ${profile.middleName})` : ''}`,
      `- Class: ${profile.grade.name}${profile.section?.name ? ` / ${profile.section.name}` : ''}`,
      `- Status: ${profile.status}`,
      profile.gender ? `- Gender: ${profile.gender}` : null,
      profile.dateOfBirth
        ? `- Date of birth: ${profile.dateOfBirth.toISOString().slice(0, 10)}`
        : null,
      access.canSeePortalUsernames || isOwnChildOrSelf
        ? `- Portal username: ${profile.user.username}`
        : null,
      access.canReadStudents || isOwnChildOrSelf || user.role === 'teacher'
        ? `- Email: ${profile.user.email}`
        : null,
      (access.canReadStudents || isOwnChildOrSelf) && profile.phone
        ? `- Phone: ${profile.phone}`
        : null,
      (access.canReadStudents || isOwnChildOrSelf) && profile.address
        ? `- Address: ${profile.address}`
        : null,
      profile.nationality ? `- Nationality: ${profile.nationality}` : null,
      [profile.region, profile.zone, profile.woreda].filter(Boolean).length
        ? `- Location: ${[profile.region, profile.zone, profile.woreda].filter(Boolean).join(' / ')}`
        : null,
      access.canSeeSensitiveIds && profile.fan ? `- FAN: ${profile.fan}` : null,
      access.canSeeSensitiveIds && profile.fcn ? `- FCN: ${profile.fcn}` : null,
      (access.canReadStudents || user.role === 'teacher' || isOwnChildOrSelf) &&
      profile.cardCode
        ? `- Card code: ${profile.cardCode}`
        : null,
      access.canReadStudents
        ? `- Parents can view results: ${profile.parentsCanViewResults ? 'yes' : 'no'}`
        : null,
    ].filter((x): x is string => x != null);

    if (access.canSeeParentContacts && profile.parents.length) {
      lines.push(
        `- Linked parents: ${profile.parents
          .map((p) => {
            const n = `${p.parent.firstName} ${p.parent.lastName}`.trim();
            return [n, p.parent.email, p.parent.phone].filter(Boolean).join(' · ');
          })
          .join('; ')}`,
      );
    }

    if (access.canReadAttendance || isOwnChildOrSelf) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      const [byStatus, recent] = await Promise.all([
        this.prisma.attendanceRecord.groupBy({
          by: ['status'],
          where: {
            schoolId: user.schoolId,
            studentProfileId,
            date: { gte: start },
          },
          _count: { _all: true },
        }),
        this.prisma.attendanceRecord.findMany({
          where: { schoolId: user.schoolId, studentProfileId },
          take: 8,
          orderBy: { date: 'desc' },
          select: { date: true, status: true, subject: true },
        }),
      ]);
      lines.push(
        `- Attendance last 30 days: ${
          byStatus.length
            ? byStatus.map((r) => `${r.status}: ${r._count._all}`).join(', ')
            : 'no marks'
        }`,
      );
      if (recent.length) {
        lines.push(
          `- Recent attendance: ${recent
            .map(
              (r) =>
                `${r.date.toISOString().slice(0, 10)} ${r.status}${r.subject ? ` (${r.subject})` : ''}`,
            )
            .join('; ')}`,
        );
      }
    } else {
      lines.push('- Attendance: not authorized');
    }

    const canSeeFees = access.canReadFinance || user.role === 'parent' || user.role === 'student';
    if (canSeeFees) {
      const fees = await this.prisma.studentFee.findMany({
        where: { schoolId: user.schoolId, studentProfileId },
        take: 12,
        orderBy: { dueDate: 'desc' },
        select: {
          label: true,
          amountDueCents: true,
          paidAmountCents: true,
          status: true,
          dueDate: true,
        },
      });
      if (fees.length) {
        const due = fees.reduce((s, f) => s + f.amountDueCents, 0);
        const paid = fees.reduce((s, f) => s + f.paidAmountCents, 0);
        lines.push(
          `- Fees: ${fees.length} records; billed ${this.formatEtb(due)}; paid ${this.formatEtb(paid)}; balance ${this.formatEtb(Math.max(0, due - paid))}`,
        );
        lines.push(
          `- Fee lines: ${fees
            .map((f) => {
              const bal = Math.max(0, f.amountDueCents - f.paidAmountCents);
              return `${f.label} due ${this.formatEtb(f.amountDueCents)} paid ${this.formatEtb(f.paidAmountCents)} bal ${this.formatEtb(bal)} (${f.status})`;
            })
            .join('; ')}`,
        );
      } else {
        lines.push('- Fees: no fee records');
      }
    } else {
      lines.push('- Fees: not authorized for this role');
    }

    const parentBlockedResults =
      user.role === 'parent' && !profile.parentsCanViewResults;
    const canSeeResults =
      !parentBlockedResults &&
      (access.canReadResults ||
        user.role === 'student' ||
        user.role === 'parent');
    if (parentBlockedResults) {
      lines.push('- Results: hidden by school setting (parents cannot view)');
    } else if (canSeeResults) {
      const currentTerm = await this.prisma.academicTerm.findFirst({
        where: { schoolId: user.schoolId, isCurrent: true },
        select: { id: true, name: true },
      });
      if (currentTerm) {
        const scores = await this.prisma.studentAssessmentScore.findMany({
          where: {
            studentProfileId,
            assessment: {
              schoolId: user.schoolId,
              termId: currentTerm.id,
            },
          },
          take: 40,
          orderBy: { updatedAt: 'desc' },
          select: {
            score: true,
            assessment: {
              select: {
                name: true,
                maxScore: true,
                classSubject: {
                  select: {
                    subject: { select: { name: true } },
                  },
                },
              },
            },
          },
        });
        lines.push(
          `- Current term (${currentTerm.name}) scores: ${
            scores.length
              ? scores
                  .map((s) => {
                    const subject =
                      s.assessment.classSubject.subject.name ?? 'Subject';
                    return `${subject} / ${s.assessment.name}: ${s.score}/${s.assessment.maxScore}`;
                  })
                  .join('; ')
              : 'none entered yet'
          }`,
        );
        const report = await this.prisma.studentTermReport.findUnique({
          where: {
            studentProfileId_termId: {
              studentProfileId,
              termId: currentTerm.id,
            },
          },
          select: { teacherComment: true, principalComment: true },
        });
        if (report?.teacherComment) {
          lines.push(`- Teacher comment: ${report.teacherComment}`);
        }
        if (report?.principalComment) {
          lines.push(`- Principal comment: ${report.principalComment}`);
        }
      } else {
        lines.push('- Results: no current term set');
      }
    } else {
      lines.push('- Results: not authorized for this role');
    }

    return lines;
  }

  private async resolveFocusedTeacher(
    user: AuthUser,
    conversationText: string,
  ): Promise<{ id: string } | null> {
    const access = this.getAiDataAccess(user);
    if (!access.canReadTeachers && user.role !== 'teacher') return null;

    const q = conversationText.toLowerCase();
    const teachers = await this.prisma.teacherProfile.findMany({
      where: { schoolId: user.schoolId },
      take: 200,
      select: {
        id: true,
        userId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (user.role === 'teacher') {
      const self = teachers.find((t) => t.userId === user.id);
      if (
        self &&
        (/\b(me|myself|my profile|my assignments|about me)\b/i.test(conversationText) ||
          q.includes(`${user.firstName} ${user.lastName}`.toLowerCase()))
      ) {
        return { id: self.id };
      }
      if (!access.canReadTeachers) return self ? { id: self.id } : null;
    }

    const hits: Array<{ id: string; index: number }> = [];
    for (const t of teachers) {
      const full = `${t.user.firstName} ${t.user.lastName}`.trim().toLowerCase();
      if (full.length < 3) continue;
      const idx = q.indexOf(full);
      if (idx >= 0) hits.push({ id: t.id, index: idx });
    }
    if (!hits.length) return null;
    hits.sort((a, b) => b.index - a.index);
    return { id: hits[0].id };
  }

  private async buildFocusedTeacherDossier(
    user: AuthUser,
    teacherProfileId: string,
  ): Promise<string[]> {
    const access = this.getAiDataAccess(user);
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherProfileId, schoolId: user.schoolId },
      select: {
        id: true,
        userId: true,
        cardCode: true,
        homeroomGrade: { select: { name: true } },
        homeroomSection: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            phone: true,
          },
        },
        assignments: {
          take: 30,
          orderBy: { createdAt: 'desc' },
          select: {
            isHomeroom: true,
            grade: { select: { name: true } },
            section: { select: { name: true } },
            subject: { select: { name: true } },
            academicYear: { select: { name: true, isCurrent: true } },
          },
        },
      },
    });
    if (!teacher) return [];

    const isSelf = teacher.userId === user.id;
    if (!access.canReadTeachers && !isSelf) {
      return ['- Focused teacher: not authorized'];
    }

    const name = `${teacher.user.firstName} ${teacher.user.lastName}`.trim();
    const lines: string[] = [
      `Focused teacher dossier for ${name} (authorized for ${user.role}):`,
      `- Name: ${name}`,
      access.canReadTeachers || isSelf ? `- Email: ${teacher.user.email}` : null,
      (access.canReadTeachers || isSelf) && teacher.user.phone
        ? `- Phone: ${teacher.user.phone}`
        : null,
      (user.role === 'admin' || isSelf) && teacher.user.username
        ? `- Username: ${teacher.user.username}`
        : null,
      teacher.homeroomGrade?.name
        ? `- Homeroom: ${teacher.homeroomGrade.name}${teacher.homeroomSection?.name ? ` / ${teacher.homeroomSection.name}` : ''}`
        : '- Homeroom: not assigned',
      teacher.cardCode && (access.canReadTeachers || isSelf)
        ? `- Card code: ${teacher.cardCode}`
        : null,
      teacher.assignments.length
        ? `- Assignments: ${teacher.assignments
            .map((a) =>
              [
                a.grade.name,
                a.section?.name,
                a.subject?.name,
                a.isHomeroom ? 'homeroom' : null,
                a.academicYear?.isCurrent ? 'current year' : a.academicYear?.name,
              ]
                .filter(Boolean)
                .join(' · '),
            )
            .join('; ')}`
        : '- Assignments: none',
    ].filter((x): x is string => x != null);
    return lines;
  }

  private async buildFocusedGradeDossier(
    user: AuthUser,
    gradeIds: string[],
  ): Promise<string[]> {
    if (!gradeIds.length) return [];
    const access = this.getAiDataAccess(user);
    const canRoster =
      access.canReadStudents || user.role === 'teacher';
    if (!canRoster && user.role !== 'admin') return [];

    // Teachers: only grades they teach
    let allowedGradeIds = gradeIds;
    if (user.role === 'teacher' && !access.canReadStudents) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        select: {
          homeroomGradeId: true,
          assignments: { select: { gradeId: true } },
        },
      });
      const mine = new Set(
        [
          teacher?.homeroomGradeId,
          ...(teacher?.assignments.map((a) => a.gradeId) ?? []),
        ].filter(Boolean) as string[],
      );
      allowedGradeIds = gradeIds.filter((id) => mine.has(id));
      if (!allowedGradeIds.length) {
        return ['- Grade dossier: not authorized for that grade'];
      }
    }

    const grades = await this.prisma.grade.findMany({
      where: { schoolId: user.schoolId, id: { in: allowedGradeIds } },
      select: {
        id: true,
        name: true,
        sections: { select: { name: true }, orderBy: { name: 'asc' } },
      },
    });
    const lines: string[] = [
      'Focused grade dossier (authorized):',
    ];

    for (const g of grades) {
      const studentCount = await this.prisma.studentProfile.count({
        where: { schoolId: user.schoolId, gradeId: g.id, status: 'ACTIVE' },
      });
      lines.push(
        `- ${g.name}: ${studentCount} active students; sections: ${
          g.sections.map((s) => s.name).join(', ') || 'none'
        }`,
      );

      if (access.canReadAttendance || user.role === 'teacher') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const today = await this.prisma.attendanceRecord.groupBy({
          by: ['status'],
          where: {
            schoolId: user.schoolId,
            date: { gte: start, lt: end },
            studentProfile: { gradeId: g.id },
          },
          _count: { _all: true },
        });
        lines.push(
          `  Attendance today: ${
            today.length
              ? today.map((r) => `${r.status}: ${r._count._all}`).join(', ')
              : 'no marks'
          }`,
        );
      }

      if (access.canReadFinance) {
        const feeAgg = await this.prisma.studentFee.aggregate({
          where: {
            schoolId: user.schoolId,
            studentProfile: { gradeId: g.id },
          },
          _sum: { amountDueCents: true, paidAmountCents: true },
          _count: { _all: true },
        });
        const due = feeAgg._sum.amountDueCents ?? 0;
        const paid = feeAgg._sum.paidAmountCents ?? 0;
        lines.push(
          `  Fees: ${feeAgg._count._all} records; billed ${this.formatEtb(due)}; paid ${this.formatEtb(paid)}; balance ${this.formatEtb(Math.max(0, due - paid))}`,
        );
      }
    }

    return lines;
  }

  private async buildRoleAuthorizedLiveData(
    user: AuthUser,
    latestText: string,
    conversationText?: string,
  ): Promise<string> {
    const queryText = (conversationText || latestText || '').trim();
    const intents = this.detectQueryIntents(
      queryText || 'students teachers fees',
    );
    const isShortFollowUp =
      latestText.trim().length > 0 &&
      latestText.trim().length < 40 &&
      !this.extractRequestedGradeNumbers(latestText).length &&
      /\b(again|retry|try|please|yes|ok|same|still|now|one more)\b/i.test(
        latestText,
      );
    // If the user asks a concrete data question, fetch those domains.
    // For vague openers, still load a light role snapshot so the assistant can answer common follow-ups.
    const wantsPersonDetail =
      /\b(about him|about her|about them|tell me about|who is)\b/i.test(
        latestText,
      ) ||
      /\b(about him|about her|about them|tell me about|who is)\b/i.test(
        queryText,
      ) ||
      /\b(his|her|their)\s+(attendance|results?|fees?|scores?|marks?|profile|details?)\b/i.test(
        latestText,
      );
    const staffLike = user.role === 'admin' || user.role === 'staff';
    const wantsStudents =
      intents.students ||
      (intents.general && staffLike) ||
      isShortFollowUp ||
      wantsPersonDetail ||
      /\bname\b|\blist\b|\bhow many\b/i.test(queryText);
    const wantsTeachers =
      intents.teachers || (intents.general && staffLike) || wantsPersonDetail;
    const wantsFees =
      intents.fees ||
      wantsPersonDetail ||
      (intents.general && staffLike) ||
      ((user.role === 'parent' || user.role === 'student') && intents.fees);
    const wantsAttendance = intents.attendance || wantsPersonDetail;
    const wantsResults = intents.results || wantsPersonDetail;
    const wantsAnnouncements =
      intents.announcements || (intents.general && staffLike);

    const lines: string[] = [
      '',
      'Live school data (authorized for this signed-in role — answer from this; do not say you lack access):',
      `- Access role: ${user.role}`,
    ];

    const grades = await this.prisma.grade.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
    // Prefer grades from the latest message; fall back to full conversation
    // so "again try" still resolves "grade 11" from an earlier turn.
    const matchedFromLatest = this.matchGradeNames(latestText, grades);
    const matchedGrades =
      matchedFromLatest.length > 0
        ? matchedFromLatest
        : this.matchGradeNames(queryText, grades);

    const access = this.getAiDataAccess(user);
    const canReadStudents = access.canReadStudents;
    const canReadTeachers = access.canReadTeachers;
    const canReadFinance = access.canReadFinance;
    const canReadAttendance = access.canReadAttendance;
    const canReadResults = access.canReadResults;
    const canReadAnnouncements = access.canReadAnnouncements;
    lines.push(
      `- Authorized domains: students=${canReadStudents}, teachers=${canReadTeachers}, finance=${canReadFinance}, attendance=${canReadAttendance}, results=${canReadResults}`,
    );

    // --- Students / roster ---
    if (wantsStudents) {
      if (canReadStudents) {
        const studentSelect = {
          grade: { select: { name: true } },
          section: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        } as const;

        const byGrade = await this.prisma.studentProfile.groupBy({
          by: ['gradeId'],
          where: { schoolId: user.schoolId, status: 'ACTIVE' },
          _count: { _all: true },
        });
        const gradeNameById = new Map(grades.map((g) => [g.id, g.name]));
        const countLines = byGrade
          .map((row) => {
            const name = gradeNameById.get(row.gradeId) ?? row.gradeId;
            return `${name}: ${row._count._all}`;
          })
          .join('; ');
        lines.push('- Student counts by grade (ACTIVE): ' + (countLines || 'none'));

        // When a grade is named, fetch that grade's roster directly (per grade)
        // so a popular Grade 1 never crowds out the single Grade 11 student.
        let sampleStudents: Array<{
          grade: { name: string };
          section: { name: string } | null;
          user: { firstName: string; lastName: string };
        }> = [];

        if (matchedGrades.length > 0) {
          lines.push(
            `- Asked about grade(s): ${matchedGrades.map((g) => g.name).join(', ')}`,
          );
          const perGrade = await Promise.all(
            matchedGrades.map((g) =>
              this.prisma.studentProfile.findMany({
                where: {
                  schoolId: user.schoolId,
                  status: 'ACTIVE',
                  gradeId: g.id,
                },
                take: 25,
                orderBy: { user: { firstName: 'asc' } },
                select: studentSelect,
              }),
            ),
          );
          sampleStudents = perGrade.flat();
          for (const g of matchedGrades) {
            const count =
              byGrade.find((row) => row.gradeId === g.id)?._count._all ?? 0;
            const names = sampleStudents
              .filter((s) => s.grade.name === g.name)
              .map((s) => `${s.user.firstName} ${s.user.lastName}`.trim());
            lines.push(
              `- Students in ${g.name} (${count} active): ${
                names.length ? names.join('; ') : 'none listed'
              }`,
            );
          }
        } else {
          sampleStudents = await this.prisma.studentProfile.findMany({
            where: { schoolId: user.schoolId, status: 'ACTIVE' },
            take: 12,
            orderBy: [
              { grade: { sortOrder: 'asc' } },
              { user: { firstName: 'asc' } },
            ],
            select: studentSelect,
          });
          if (sampleStudents.length) {
            lines.push(
              '- Sample students: ' +
                sampleStudents
                  .map((s) => {
                    const name = `${s.user.firstName} ${s.user.lastName}`.trim();
                    const cls = [s.grade.name, s.section?.name]
                      .filter(Boolean)
                      .join(' / ');
                    return `${name} (${cls})`;
                  })
                  .join('; '),
            );
          } else {
            lines.push('- Sample students: none found');
          }
        }
      } else if (user.role === 'teacher') {
        const teacher = await this.prisma.teacherProfile.findUnique({
          where: { userId: user.id },
          select: {
            homeroomGradeId: true,
            homeroomSectionId: true,
            assignments: {
              select: {
                gradeId: true,
                sectionId: true,
                grade: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        });
        const gradeIds = [
          ...new Set(
            [
              teacher?.homeroomGradeId,
              ...(teacher?.assignments.map((a) => a.gradeId) ?? []),
            ].filter(Boolean) as string[],
          ),
        ];
        const targetGradeIds =
          matchedGrades.length > 0
            ? matchedGrades.map((g) => g.id).filter((id) => gradeIds.includes(id))
            : gradeIds;
        if (!targetGradeIds.length) {
          lines.push(
            '- Students: no teaching/homeroom assignments — cannot list class rosters',
          );
        } else {
          const roster = await this.prisma.studentProfile.findMany({
            where: {
              schoolId: user.schoolId,
              status: 'ACTIVE',
              gradeId: { in: targetGradeIds },
            },
            take: 25,
            orderBy: { user: { firstName: 'asc' } },
            select: {
              grade: { select: { name: true } },
              section: { select: { name: true } },
              user: { select: { firstName: true, lastName: true } },
            },
          });
          lines.push(
            `- Your class roster sample: ${
              roster.length
                ? roster
                    .map((s) => {
                      const name = `${s.user.firstName} ${s.user.lastName}`.trim();
                      const cls = [s.grade.name, s.section?.name]
                        .filter(Boolean)
                        .join(' / ');
                      return `${name} (${cls})`;
                    })
                    .join('; ')
                : 'none'
            }`,
          );
        }
      } else if (user.role === 'student') {
        const me = await this.prisma.studentProfile.findUnique({
          where: { userId: user.id },
          select: {
            status: true,
            grade: { select: { name: true } },
            section: { select: { name: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        });
        if (me) {
          lines.push(
            `- Your student record: ${me.user.firstName} ${me.user.lastName} — ${me.grade.name}${me.section?.name ? ` / ${me.section.name}` : ''} (${me.status})`,
          );
        }
        lines.push(
          '- Other students: not available for student role (privacy)',
        );
      } else if (user.role === 'parent') {
        const children = await this.prisma.parentStudent.findMany({
          where: { parentId: user.id },
          take: 20,
          select: {
            student: {
              select: {
                status: true,
                grade: { select: { name: true } },
                section: { select: { name: true } },
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });
        lines.push(
          `- Your linked children: ${
            children.length
              ? children
                  .map((c) => {
                    const s = c.student;
                    return `${s.user.firstName} ${s.user.lastName} — ${s.grade.name}${s.section?.name ? ` / ${s.section.name}` : ''} (${s.status})`;
                  })
                  .join('; ')
              : 'none'
          }`,
        );
        lines.push(
          '- Other students: not available for parent role (privacy)',
        );
      } else {
        lines.push('- Students: not authorized for this role/permission');
      }
    }

    // --- Focused student dossier (name / "about him" follow-ups) ---
    if (
      (wantsPersonDetail ||
        wantsStudents ||
        wantsAttendance ||
        wantsResults ||
        wantsFees) &&
      (canReadStudents ||
        user.role === 'teacher' ||
        user.role === 'parent' ||
        user.role === 'student')
    ) {
      const focused = await this.resolveFocusedStudent(
        user,
        queryText,
        matchedGrades.map((g) => g.id),
      );
      if (focused) {
        const dossier = await this.buildFocusedStudentDossier(user, focused.id);
        if (dossier.length) {
          lines.push('', ...dossier);
        }
      } else if (wantsPersonDetail && (canReadStudents || user.role === 'teacher')) {
        lines.push(
          '- Focused student: could not resolve which student “him/her” refers to — ask for the full name',
        );
      }
    }

    // --- Focused grade dossier ---
    if (matchedGrades.length && (canReadStudents || user.role === 'teacher' || canReadFinance)) {
      const gradeDossier = await this.buildFocusedGradeDossier(
        user,
        matchedGrades.map((g) => g.id),
      );
      if (gradeDossier.length) {
        lines.push('', ...gradeDossier);
      }
    }

    // --- Focused teacher dossier ---
    if (wantsTeachers || wantsPersonDetail) {
      const focusedTeacher = await this.resolveFocusedTeacher(user, queryText);
      if (focusedTeacher) {
        const teacherDossier = await this.buildFocusedTeacherDossier(
          user,
          focusedTeacher.id,
        );
        if (teacherDossier.length) {
          lines.push('', ...teacherDossier);
        }
      }
    }

    // --- Teachers ---
    if (wantsTeachers) {
      if (canReadTeachers) {
        const teachers = await this.prisma.teacherProfile.findMany({
          where: { schoolId: user.schoolId },
          take: 20,
          orderBy: { user: { firstName: 'asc' } },
          select: {
            user: { select: { firstName: true, lastName: true, email: true } },
            homeroomGrade: { select: { name: true } },
            homeroomSection: { select: { name: true } },
            _count: { select: { assignments: true } },
          },
        });
        lines.push(
          `- Teachers (${teachers.length} shown): ${
            teachers.length
              ? teachers
                  .map((t) => {
                    const name = `${t.user.firstName} ${t.user.lastName}`.trim();
                    const hr = t.homeroomGrade
                      ? `homeroom ${t.homeroomGrade.name}${t.homeroomSection?.name ? `/${t.homeroomSection.name}` : ''}`
                      : 'no homeroom';
                    return `${name} (${hr}, ${t._count.assignments} assignments)`;
                  })
                  .join('; ')
              : 'none'
          }`,
        );
      } else if (user.role === 'teacher') {
        lines.push(`- Teacher self: ${user.firstName} ${user.lastName}`);
      } else {
        lines.push('- Teachers directory: not authorized for this role/permission');
      }
    }

    // --- Fees ---
    if (wantsFees) {
      if (canReadFinance) {
        const [agg, overdueCount] = await Promise.all([
          this.prisma.studentFee.aggregate({
            where: { schoolId: user.schoolId },
            _sum: { amountDueCents: true, paidAmountCents: true },
            _count: { _all: true },
          }),
          this.prisma.studentFee.count({
            where: {
              schoolId: user.schoolId,
              status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
              dueDate: { lt: new Date() },
            },
          }),
        ]);
        const due = agg._sum.amountDueCents ?? 0;
        const paid = agg._sum.paidAmountCents ?? 0;
        lines.push(
          `- Finance summary: ${agg._count._all} fee records; billed ${this.formatEtb(due)}; collected ${this.formatEtb(paid)}; outstanding ${this.formatEtb(Math.max(0, due - paid))}; overdue/open past due: ${overdueCount}`,
        );
      } else if (user.role === 'student' || user.role === 'parent') {
        const studentIds =
          user.role === 'student'
            ? (
                await this.prisma.studentProfile.findMany({
                  where: { userId: user.id },
                  select: { id: true },
                })
              ).map((s) => s.id)
            : (
                await this.prisma.parentStudent.findMany({
                  where: { parentId: user.id },
                  select: { studentId: true },
                })
              ).map((l) => l.studentId);
        if (studentIds.length) {
          const fees = await this.prisma.studentFee.findMany({
            where: {
              schoolId: user.schoolId,
              studentProfileId: { in: studentIds },
            },
            take: 15,
            orderBy: { dueDate: 'desc' },
            select: {
              label: true,
              amountDueCents: true,
              paidAmountCents: true,
              status: true,
              dueDate: true,
              studentProfile: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          });
          lines.push(
            `- Your fee records: ${
              fees.length
                ? fees
                    .map((f) => {
                      const who = `${f.studentProfile.user.firstName} ${f.studentProfile.user.lastName}`.trim();
                      const bal = Math.max(
                        0,
                        f.amountDueCents - f.paidAmountCents,
                      );
                      return `${who}: ${f.label} due ${this.formatEtb(f.amountDueCents)} paid ${this.formatEtb(f.paidAmountCents)} bal ${this.formatEtb(bal)} (${f.status}, due ${f.dueDate.toISOString().slice(0, 10)})`;
                    })
                    .join('; ')
                : 'none'
            }`,
          );
        } else {
          lines.push('- Fee records: none linked');
        }
      } else {
        lines.push('- Finance: not authorized for this role/permission');
      }
    }

    // --- Attendance (today snapshot) ---
    if (wantsAttendance && canReadAttendance) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      let studentScope: { gradeId?: { in: string[] } } | undefined;
      if (!access.canReadAttendanceSchoolWide && user.role === 'teacher') {
        const teacher = await this.prisma.teacherProfile.findUnique({
          where: { userId: user.id },
          select: {
            homeroomGradeId: true,
            assignments: { select: { gradeId: true } },
          },
        });
        const gradeIds = [
          ...new Set(
            [
              teacher?.homeroomGradeId,
              ...(teacher?.assignments.map((a) => a.gradeId) ?? []),
            ].filter(Boolean) as string[],
          ),
        ];
        studentScope = gradeIds.length ? { gradeId: { in: gradeIds } } : undefined;
      }
      const today = await this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          schoolId: user.schoolId,
          date: { gte: start, lt: end },
          ...(studentScope ? { studentProfile: studentScope } : {}),
        },
        _count: { _all: true },
      });
      lines.push(
        `- Attendance today${studentScope ? ' (your classes)' : ' (school-wide)'}: ${
          today.length
            ? today.map((r) => `${r.status}: ${r._count._all}`).join(', ')
            : 'no marks yet'
        }`,
      );
    } else if (wantsAttendance && user.role === 'student') {
      const me = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (me) {
        const recent = await this.prisma.attendanceRecord.findMany({
          where: { studentProfileId: me.id },
          take: 10,
          orderBy: { date: 'desc' },
          select: { date: true, status: true, subject: true },
        });
        lines.push(
          `- Your recent attendance: ${
            recent.length
              ? recent
                  .map(
                    (r) =>
                      `${r.date.toISOString().slice(0, 10)} ${r.status}${r.subject ? ` (${r.subject})` : ''}`,
                  )
                  .join('; ')
              : 'none'
          }`,
        );
      }
    } else if (wantsAttendance) {
      lines.push('- Attendance: not authorized for this role/permission');
    }

    // --- Results (light) ---
    if (wantsResults && canReadResults && user.role !== 'student' && user.role !== 'parent') {
      const term = await this.prisma.academicTerm.findFirst({
        where: { schoolId: user.schoolId, isCurrent: true },
        select: { id: true, name: true },
      });
      if (term) {
        const sheetCount = await this.prisma.classSubjectTermSheet.count({
          where: { schoolId: user.schoolId, termId: term.id },
        });
        lines.push(
          `- Results: current term “${term.name}” has ${sheetCount} class subject sheets`,
        );
      } else {
        lines.push('- Results: no current term set');
      }
    } else if (wantsResults && (user.role === 'student' || user.role === 'parent')) {
      lines.push(
        '- Results detail: open Results / Report card in your portal for full scores (assistant shows navigation + high-level context)',
      );
    }

    // --- Announcements ---
    if (wantsAnnouncements && canReadAnnouncements) {
      const notes = await this.prisma.announcement.findMany({
        where: {
          schoolId: user.schoolId,
          OR: [{ recipientUserId: null }, { recipientUserId: user.id }],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { title: true, createdAt: true },
      });
      lines.push(
        `- Recent announcements: ${
          notes.length
            ? notes
                .map(
                  (n) =>
                    `“${n.title}” (${n.createdAt.toISOString().slice(0, 10)})`,
                )
                .join('; ')
            : 'none'
        }`,
      );
    }

    if (lines.length <= 3) {
      return '';
    }
    return lines.join('\n');
  }

  private roleNavigationMap(role: AuthUser['role']): string {
    const maps: Record<AuthUser['role'], string[]> = {
      admin: [
        'Overview /admin',
        'Students /admin/students',
        'Admissions /admin/admissions',
        'Parents /admin/parents',
        'Academics (years/terms/grades) /admin/academics',
        'Teachers /admin/teachers',
        'Assign subjects /admin/subjects/assign',
        'Subjects /admin/subjects',
        'Timetable /admin/timetable',
        'Exam schedules /admin/exams',
        'eLibrary /admin/library',
        'Staff /admin/staff',
        'Attendance /admin/attendance',
        'Results /admin/results',
        'Report cards /admin/report-cards',
        'Reports /admin/reports',
        'Assessment templates /admin/results/templates',
        'Finance /admin/finance',
        'Billing (Chora plan) /admin/billing',
        'Announcements /admin/announcements',
        'Support /admin/support',
        'Settings /admin/settings',
        'Profile /admin/profile',
      ],
      staff: [
        'Overview /admin',
        'Students /admin/students',
        'Admissions /admin/admissions',
        'Parents /admin/parents',
        'Academics /admin/academics',
        'Teachers /admin/teachers',
        'Subjects /admin/subjects',
        'Timetable /admin/timetable',
        'Exam schedules /admin/exams',
        'eLibrary /admin/library',
        'Staff /admin/staff',
        'Attendance /admin/attendance',
        'Results /admin/results',
        'Report cards /admin/report-cards',
        'Finance /admin/finance',
        'Announcements /admin/announcements',
        'Settings /admin/settings (if permitted)',
        'Profile /admin/profile',
      ],
      teacher: [
        'Overview /teacher',
        'Attendance /teacher/attendance (homeroom)',
        'Results /teacher/results',
        'Results by student /teacher/results/by-student',
        'Score reports /teacher/results/score-reports',
        'Assignments /teacher/classwork',
        'Worksheets /teacher/worksheets',
        'Timetable /teacher/timetable',
        'Exam schedules /teacher/exams',
        'eLibrary /teacher/library',
        'Staff ID /teacher/id-card',
        'Profile /teacher/profile',
      ],
      student: [
        'Overview /student',
        'Campus ID /student/id-card',
        'Attendance /student/attendance',
        'Results /student/results',
        'Report card /student/report-card',
        'Assignments /student/classwork',
        'Worksheets /student/worksheets',
        'Fees /student/fees',
        'Timetable /student/timetable',
        'Exam schedules /student/exams',
        'eLibrary /student/library',
        'Profile /student/profile',
      ],
      parent: [
        'Overview /parent',
        'Results /parent/results',
        'Report card /parent/report-card',
        'Fees /parent/fees',
        'Timetable /parent/timetable',
        'Exam schedules /parent/exams',
        'Profile /parent/profile',
      ],
    };
    return maps[role].map((line) => `  - ${line}`).join('\n');
  }

  private async buildChatSessionContext(user: AuthUser): Promise<string> {
    const schoolId = user.schoolId;

    const [
      school,
      currentYear,
      currentTerm,
      yearTerms,
      grades,
      subjects,
      feeTypes,
      studentCount,
      teacherCount,
      staffCount,
      parentCount,
      subjectCount,
      gradeCount,
      announcementCount,
      libraryCount,
      timetableExists,
      studentProfile,
      teacherProfile,
      parentChildren,
    ] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          slug: true,
          joinCode: true,
          schoolType: true,
          address: true,
          email: true,
          phone: true,
          country: true,
          attendanceMode: true,
          gradePreset: true,
          curriculumPackageKey: true,
          reportCardTitle: true,
          reportCardTagline: true,
          authorizedSignatureLabel: true,
          bankName: true,
          bankAccountHolder: true,
          bankAccountNumber: true,
          telebirrNumber: true,
          telebirrAccountName: true,
          paymentInstructions: true,
          status: true,
          setupComplete: true,
          subscription: {
            select: {
              plan: true,
              isActive: true,
              enabledModules: true,
              billingBundle: true,
              trialEndsAt: true,
              currentPeriodEnd: true,
            },
          },
        },
      }),
      this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
      this.prisma.academicTerm.findFirst({
        where: { schoolId, isCurrent: true },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          academicYearId: true,
        },
      }),
      this.prisma.academicTerm.findMany({
        where: { schoolId },
        orderBy: [{ academicYearId: 'asc' }, { sortOrder: 'asc' }],
        take: 12,
        select: {
          name: true,
          isCurrent: true,
          academicYear: { select: { name: true, isCurrent: true } },
        },
      }),
      this.prisma.grade.findMany({
        where: { schoolId },
        orderBy: { sortOrder: 'asc' },
        take: 40,
        select: {
          name: true,
          sections: { select: { name: true }, orderBy: { name: 'asc' } },
        },
      }),
      this.prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
        take: 60,
        select: { name: true, code: true },
      }),
      this.prisma.feeType.findMany({
        where: { schoolId, isActive: true },
        orderBy: { name: 'asc' },
        take: 20,
        select: { name: true, code: true },
      }),
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.teacherProfile.count({ where: { schoolId } }),
      this.prisma.user.count({
        where: { schoolId, role: { in: ['admin', 'staff'] } },
      }),
      this.prisma.user.count({ where: { schoolId, role: 'parent' } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.grade.count({ where: { schoolId } }),
      this.prisma.announcement.count({ where: { schoolId } }),
      this.prisma.libraryResource.count({ where: { schoolId } }),
      this.prisma.timetable.findFirst({
        where: { schoolId },
        select: { id: true, academicYearId: true },
      }),
      user.role === 'student'
        ? this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
            select: {
              id: true,
              status: true,
              gender: true,
              dateOfBirth: true,
              grade: { select: { name: true } },
              section: { select: { name: true } },
              parentsCanViewResults: true,
              _count: {
                select: {
                  studentFees: true,
                  classworkSubmissions: true,
                },
              },
            },
          })
        : Promise.resolve(null),
      user.role === 'teacher'
        ? this.prisma.teacherProfile.findUnique({
            where: { userId: user.id },
            select: {
              homeroomGrade: { select: { name: true } },
              homeroomSection: { select: { name: true } },
              assignments: {
                take: 30,
                orderBy: { createdAt: 'desc' },
                select: {
                  isHomeroom: true,
                  grade: { select: { name: true } },
                  section: { select: { name: true } },
                  subject: { select: { name: true } },
                  academicYear: { select: { name: true, isCurrent: true } },
                },
              },
            },
          })
        : Promise.resolve(null),
      user.role === 'parent'
        ? this.prisma.parentStudent.findMany({
            where: { parentId: user.id },
            take: 20,
            select: {
              student: {
                select: {
                  grade: { select: { name: true } },
                  section: { select: { name: true } },
                  status: true,
                  user: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const modules = Array.isArray(school?.subscription?.enabledModules)
      ? (school.subscription.enabledModules as string[])
      : [];

    const gradeLines = grades.map((g) => {
      const sections = g.sections.map((s) => s.name).join(', ');
      return sections ? `${g.name} [${sections}]` : g.name;
    });

    const subjectLines = subjects.map((s) =>
      s.code ? `${s.name} (${s.code})` : s.name,
    );

    const termLines = yearTerms.map((t) => {
      const flag = t.isCurrent ? 'current' : t.academicYear.isCurrent ? 'this year' : '';
      return `${t.academicYear.name} / ${t.name}${flag ? ` (${flag})` : ''}`;
    });

    const teacherAssignmentLines =
      teacherProfile?.assignments.map((a) => {
        const parts = [
          a.grade.name,
          a.section?.name,
          a.subject?.name,
          a.isHomeroom ? 'homeroom' : null,
          a.academicYear?.isCurrent ? 'current year' : a.academicYear?.name,
        ].filter(Boolean);
        return parts.join(' · ');
      }) ?? [];

    const childLines =
      parentChildren?.map((link) => {
        const s = link.student;
        const name = `${s.user.firstName} ${s.user.lastName}`.trim();
        const cls = [s.grade.name, s.section?.name].filter(Boolean).join(' / ');
        return `${name} — ${cls} (${s.status})`;
      }) ?? [];

    const access = this.getAiDataAccess(user);
    const paymentBits = access.canSeePaymentAccounts
      ? [
          school?.bankName
            ? `Bank: ${school.bankName}${school.bankAccountHolder ? ` / ${school.bankAccountHolder}` : ''}${school.bankAccountNumber ? ` / ${school.bankAccountNumber}` : ''}`
            : null,
          school?.telebirrNumber
            ? `Telebirr: ${school.telebirrNumber}${school.telebirrAccountName ? ` (${school.telebirrAccountName})` : ''}`
            : null,
          school?.paymentInstructions
            ? `Payment instructions: ${school.paymentInstructions}`
            : null,
        ].filter(Boolean)
      : user.role === 'parent' || user.role === 'student'
        ? [
            school?.paymentInstructions
              ? `Payment instructions: ${school.paymentInstructions}`
              : null,
            school?.bankName ? `Bank name: ${school.bankName}` : null,
            school?.telebirrAccountName
              ? `Telebirr account name: ${school.telebirrAccountName}`
              : null,
          ].filter(Boolean)
        : [];

    const lines = [
      'Session facts (authoritative — treat as known):',
      '',
      'User',
      `- Name: ${`${user.firstName} ${user.lastName}`.trim()}`,
      `- Username: ${user.username}`,
      `- Email: ${user.email}`,
      `- Role: ${user.role}`,
      user.roleTemplateName ? `- Role template: ${user.roleTemplateName}` : null,
      user.permissions?.length
        ? `- Permissions: ${user.permissions.slice(0, 40).join(', ')}${user.permissions.length > 40 ? '…' : ''}`
        : '- Permissions: (none listed / role defaults)',
      '',
      'School',
      school ? `- School name: ${school.name}` : '- School name: (unavailable)',
      school?.slug ? `- Slug: ${school.slug}` : null,
      access.canSeeJoinCode && school?.joinCode
        ? `- Join code: ${school.joinCode}`
        : null,
      school?.schoolType ? `- Type: ${school.schoolType}` : null,
      school?.address ? `- Address: ${school.address}` : null,
      school?.email ? `- Email: ${school.email}` : null,
      school?.phone ? `- Phone: ${school.phone}` : null,
      school?.country ? `- Country: ${school.country}` : null,
      school ? `- Attendance mode: ${school.attendanceMode}` : null,
      school?.gradePreset ? `- Grade preset: ${school.gradePreset}` : null,
      school?.curriculumPackageKey
        ? `- Curriculum package: ${school.curriculumPackageKey}`
        : null,
      school?.reportCardTitle
        ? `- Report card title: ${school.reportCardTitle}`
        : null,
      school?.reportCardTagline
        ? `- Report card tagline: ${school.reportCardTagline}`
        : null,
      school?.authorizedSignatureLabel
        ? `- Signature label: ${school.authorizedSignatureLabel}`
        : null,
      school ? `- Status: ${school.status}` : null,
      school
        ? `- Setup complete: ${school.setupComplete ? 'yes' : 'no'}`
        : null,
      '',
      'Subscription',
      school?.subscription
        ? `- Plan: ${school.subscription.plan} (${school.subscription.isActive ? 'active' : 'inactive'})`
        : '- Plan: (none)',
      school?.subscription?.billingBundle
        ? `- Bundle: ${school.subscription.billingBundle}`
        : null,
      school?.subscription?.trialEndsAt
        ? `- Trial ends: ${school.subscription.trialEndsAt.toISOString().slice(0, 10)}`
        : null,
      school?.subscription?.currentPeriodEnd
        ? `- Period end: ${school.subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
        : null,
      modules.length
        ? `- Enabled modules: ${modules.join(', ')}`
        : school?.subscription
          ? '- Enabled modules: all (grandfather / unrestricted)'
          : null,
      '',
      'Academics',
      currentYear
        ? `- Current academic year: ${currentYear.name} (${currentYear.startDate.toISOString().slice(0, 10)} → ${currentYear.endDate.toISOString().slice(0, 10)})`
        : '- Current academic year: not set',
      currentTerm
        ? `- Current academic term: ${currentTerm.name} (${currentTerm.startDate.toISOString().slice(0, 10)} → ${currentTerm.endDate.toISOString().slice(0, 10)})`
        : '- Current academic term: not set',
      termLines.length ? `- Terms: ${termLines.join('; ')}` : null,
      timetableExists
        ? `- Timetable: configured${currentYear && timetableExists.academicYearId === currentYear.id ? ' for current year' : ''}`
        : '- Timetable: not configured yet',
      '',
      'School structure',
      access.canReadStudents || user.role === 'admin'
        ? `- Counts: ${studentCount} students, ${teacherCount} teachers, ${staffCount} admin/staff, ${parentCount} parents, ${gradeCount} grades, ${subjectCount} subjects, ${announcementCount} announcements, ${libraryCount} library resources`
        : `- Counts (limited): ${gradeCount} grades, ${subjectCount} subjects, ${libraryCount} library resources`,
      gradeLines.length
        ? `- Grades & sections: ${gradeLines.join('; ')}`
        : '- Grades & sections: none yet',
      subjectLines.length
        ? `- Subjects: ${subjectLines.join('; ')}`
        : '- Subjects: none yet',
      (access.canReadFinance || user.role === 'parent' || user.role === 'student') &&
      feeTypes.length
        ? `- Active fee types: ${feeTypes.map((f) => f.name).join('; ')}`
        : access.canReadFinance
          ? '- Active fee types: none yet'
          : null,
      paymentBits.length
        ? `- School payment methods: ${paymentBits.join(' | ')}`
        : access.canSeePaymentAccounts
          ? '- School payment methods: not configured'
          : null,
      '',
      'Role-specific',
      studentProfile
        ? `- Student class: ${studentProfile.grade.name}${studentProfile.section?.name ? ` / ${studentProfile.section.name}` : ''} (${studentProfile.status})`
        : null,
      studentProfile?.dateOfBirth
        ? `- Student DOB: ${studentProfile.dateOfBirth.toISOString().slice(0, 10)}`
        : null,
      studentProfile
        ? `- Parents can view results: ${studentProfile.parentsCanViewResults ? 'yes' : 'no'}`
        : null,
      studentProfile
        ? `- Student fee records: ${studentProfile._count.studentFees}; classwork submissions: ${studentProfile._count.classworkSubmissions}`
        : null,
      teacherProfile?.homeroomGrade?.name
        ? `- Homeroom: ${teacherProfile.homeroomGrade.name}${teacherProfile.homeroomSection?.name ? ` / ${teacherProfile.homeroomSection.name}` : ''}`
        : teacherProfile
          ? '- Homeroom: not assigned'
          : null,
      teacherAssignmentLines.length
        ? `- Teaching assignments: ${teacherAssignmentLines.join('; ')}`
        : teacherProfile
          ? '- Teaching assignments: none listed'
          : null,
      childLines.length
        ? `- Linked children: ${childLines.join('; ')}`
        : user.role === 'parent'
          ? '- Linked children: none'
          : null,
      '',
      `Navigation map for this ${user.role} (use these paths when guiding):`,
      this.roleNavigationMap(user.role),
    ].filter((line) => line !== null);

    return lines.join('\n');
  }
}
