import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/infra/redis/redis.module';
import { PrismaService } from 'src/infra/database/prisma.service';
import { TicketService } from '../ticket/ticket.service';
import { MessageType, SenderType } from '../../../generated/prisma/enums';
import { WhatsappService } from 'src/infra/whatsapp/whatsapp.service';

export enum ConversationState {
  IDLE = 'IDLE',
  COLLECTING_NAME = 'COLLECTING_NAME',
  COLLECTING_NIK = 'COLLECTING_NIK',
  COLLECTING_EMAIL = 'COLLECTING_EMAIL',
  COLLECTING_CATEGORY = 'COLLECTING_CATEGORY',
  COLLECTING_DESCRIPTION = 'COLLECTING_DESCRIPTION',
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ticketService: TicketService,
    private readonly whatsappService: WhatsappService,
  ) { }

  verifyWebhook(mode: string, token: string, challenge: string) {
    const verifyToken = this.configService.get<string>('WA_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    return 'Verification failed';
  }

  async processIncoming(payload: any) {
    this.logger.log('Received WhatsApp payload');

    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return { status: 'ignored' };
    }

    const phoneNumber = message.from;
    const text = message.text?.body;

    if (!text) {
      return { status: 'ignored' };
    }

    // 1. Get or Create User
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          isVerified: false,
        },
      });
    }

    // 2. Get active session or create new one
    let session = await this.prisma.session.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    if (!session) {
      const channel = await this.prisma.channel.findFirst({ where: { provider: 'whatsapp' } })
        || await this.prisma.channel.create({ data: { name: 'WhatsApp', provider: 'whatsapp' } });

      session = await this.prisma.session.create({
        data: {
          userId: user.id,
          channelId: channel.id,
          state: ConversationState.IDLE,
          isActive: true,
          startedAt: new Date(),
        },
      });
    }

    // 3. Log incoming message
    await this.logMessage(session.id, SenderType.USER, text);

    // 4. Update session last activity
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() }
    });

    // 5. Handle transitions
    await this.handleStateTransition(user, session, text);

    return { status: 'processed' };
  }

  private async handleStateTransition(user: any, session: any, text: string) {
    const currentState = session.state as ConversationState;

    switch (currentState) {
      case ConversationState.IDLE:
        await this.sendMessage(session.id, user.phoneNumber, 'Halo! Selamat datang di Layanan Publik Pintar.');
        await this.showCategoryMenu(session.id, user.phoneNumber);
        break;

      case ConversationState.COLLECTING_CATEGORY: {
        // Fetch the currently displayed categories (based on current parent in Redis)
        const currentParentId = await this.redis.get(`session_data:${session.id}:parent_category`);
        const categories = await this.prisma.category.findMany({
          where: {
            isActive: true,
            parentId: currentParentId ?? null,
          },
          orderBy: { sortOrder: 'asc' },
        });

        const choice = parseInt(text);

        if (isNaN(choice) || choice < 1 || choice > categories.length) {
          await this.sendMessage(session.id, user.phoneNumber, 'Pilihan tidak valid. Silakan pilih nomor yang tersedia.');
          return;
        }

        const selectedCategory = categories[choice - 1];

        // Check if this category has children (is it a branch or a leaf?)
        const children = await this.prisma.category.findMany({
          where: { parentId: selectedCategory.id, isActive: true },
        });

        if (children.length > 0) {
          // Branch: store as current parent and show sub-categories
          await this.redis.set(`session_data:${session.id}:parent_category`, selectedCategory.id, 'EX', 3600);
          await this.sendMessage(session.id, user.phoneNumber, `Anda memilih: *${selectedCategory.name}*`);
          await this.showCategoryMenu(session.id, user.phoneNumber, selectedCategory.id);
        } else {
          // Leaf: store final category and ask for description
          await this.redis.set(`session_data:${session.id}:category`, selectedCategory.id, 'EX', 3600);
          await this.sendMessage(
            session.id,
            user.phoneNumber,
            `Anda memilih kategori: *${selectedCategory.name}*\n\nSilakan jelaskan keluhan Anda secara detail.`,
          );
          await this.updateSessionState(session.id, ConversationState.COLLECTING_DESCRIPTION);
        }
        break;
      }

      case ConversationState.COLLECTING_DESCRIPTION:
        const catId = await this.redis.get(`session_data:${session.id}:category`);

        await this.ticketService.create({
          description: text,
          userId: user.id,
          categoryId: catId || '',
        });

        await this.sendMessage(session.id, user.phoneNumber, 'Terima kasih! Laporan Anda telah kami terima. Sesi akan ditutup.');
        await this.prisma.session.update({
          where: { id: session.id },
          data: { isActive: false, state: 'COMPLETED' }
        });
        break;
    }
  }

  private async showCategoryMenu(
    sessionId: string,
    phoneNumber: string,
    parentId: string | null = null,
  ) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: parentId ?? null },
      orderBy: { sortOrder: 'asc' },
    });

    if (categories.length === 0) {
      await this.sendMessage(sessionId, phoneNumber, 'Mohon maaf, saat ini belum ada kategori layanan yang tersedia.');
      await this.prisma.session.update({ where: { id: sessionId }, data: { isActive: false, state: 'NO_CATEGORIES' } });
      return;
    }

    const title = parentId ? 'Silakan pilih sub-kategori (balas dengan angka):' : 'Silakan pilih kategori keluhan Anda (balas dengan angka):';
    let menu = `${title}\n`;
    categories.forEach((cat, index) => {
      menu += `\n${index + 1}. ${cat.name}`;
      if (cat.description) menu += ` — ${cat.description}`;
    });

    await this.sendMessage(sessionId, phoneNumber, menu);
    await this.updateSessionState(sessionId, ConversationState.COLLECTING_CATEGORY);
  }

  private async updateSessionState(sessionId: string, state: ConversationState) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { state }
    });
  }

  private async logMessage(sessionId: string, sender: SenderType, content: string) {
    await this.prisma.message.create({
      data: {
        sessionId,
        sender,
        messageType: MessageType.TEXT,
        content,
      }
    });
  }

  private async sendMessage(sessionId: string, to: string, text: string) {
    // Log outgoing bot message to DB
    await this.logMessage(sessionId, SenderType.BOT, text);
    // Send via WhatsApp Cloud API
    await this.whatsappService.sendTextMessage(to, text);
  }

  // Timeout logic called via a Cron job
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    const timeout = new Date(Date.now() - 3600 * 1000); // 1 hour
    const sessions = await this.prisma.session.updateMany({
      where: {
        isActive: true,
        lastActivityAt: { lt: timeout }
      },
      data: { isActive: false, state: 'TIMEOUT' }
    });
    this.logger.log(`Cleaned up ${sessions.count} expired sessions`);
  }
}
