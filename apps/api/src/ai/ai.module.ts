import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PlatformAiController } from './platform-ai.controller';

@Module({
  imports: [PlatformModule],
  controllers: [AiController, PlatformAiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
