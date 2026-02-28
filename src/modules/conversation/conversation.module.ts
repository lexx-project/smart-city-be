import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

import { TicketModule } from '../ticket/ticket.module';
import { PrismaModule } from 'src/infra/database/prisma.module';

@Module({
  imports: [TicketModule, PrismaModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule { }
