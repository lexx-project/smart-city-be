import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infra/database/prisma.module';
import { BotSettingsController } from './bot-settings.controller';
import { BotSettingsService } from './bot-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [BotSettingsController],
  providers: [BotSettingsService],
  exports: [BotSettingsService],
})
export class BotSettingsModule {}
