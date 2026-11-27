import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Injectable()
export class EmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') return;
    const worker = this.config
      .get<string>('CHORA_EMAIL_WORKER')
      ?.trim()
      .toLowerCase();
    if (worker !== 'true') {
      this.logger.log('Email worker is off until CHORA_EMAIL_WORKER=true');
      return;
    }
    this.timer = setInterval(() => void this.tick(), 15_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.email.processDue();
      await this.email.pruneOld();
    } catch {
      this.logger.warn('Email queue tick failed');
    } finally {
      this.running = false;
    }
  }
}
