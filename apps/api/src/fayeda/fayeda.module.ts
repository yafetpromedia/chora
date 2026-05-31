import { Module } from '@nestjs/common';
import { FayedaController } from './fayeda.controller';
import { FayedaService } from './fayeda.service';

@Module({
  controllers: [FayedaController],
  providers: [FayedaService],
  exports: [FayedaService],
})
export class FayedaModule {}
