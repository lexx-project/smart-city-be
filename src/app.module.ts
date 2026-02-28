import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './infra/database/prisma.module';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './infra/auth/auth';
import { RedisModule } from './infra/redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ConversationModule } from './modules/conversation/conversation.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { SlaModule } from './modules/sla/sla.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WhatsappModule } from './infra/whatsapp/whatsapp.module';
import { AgencyModule } from './modules/agency/agency.module';
import { CategoryModule } from './modules/category/category.module';
import { StaffModule } from './modules/staff/staff.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './infra/guards/jwt-auth.guard';
import { RolesGuard } from './infra/guards/roles.guard';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // BetterAuthModule.forRoot({ auth }),
    PrismaModule,
    RedisModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    WhatsappModule,

    AuthModule,
    UserModule,
    ConversationModule,
    TicketModule,
    SlaModule,
    AnalyticsModule,
    AgencyModule,
    CategoryModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JWT guard globally — routes opt-out with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply Roles guard globally — routes opt-in with @Roles('ADMIN')
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }
