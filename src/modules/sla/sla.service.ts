import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/infra/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TicketCreatedEvent,
  TicketEscalatedEvent,
} from 'src/common/events/ticket.events';
import { CreateSlaRuleDto } from './dto/create-sla-rule.dto';
import { UpdateSlaRuleDto } from './dto/update-sla-rule.dto';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  // ──────────────────────────────────────────────────────────────────
  // EVENT: ticket.created → Calculate and store slaDeadline on ticket
  // ──────────────────────────────────────────────────────────────────
  @OnEvent('ticket.created')
  async handleTicketCreated(event: TicketCreatedEvent) {
    this.logger.log(`[SLA] Processing ticket.created: ${event.ticketNumber}`);

    // Look up SLA rule for the ticket's category
    const slaRule = await this.prisma.slaRule.findFirst({
      where: { categoryId: event.categoryId, deletedAt: null },
    });

    const slaHours = slaRule?.maxHours ?? 24; // fallback: 24 hours
    const deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    await this.prisma.ticket.update({
      where: { id: event.ticketId },
      data: { slaDeadline: deadline },
    });

    this.logger.log(
      `[SLA] Deadline set for ${event.ticketNumber}: ${deadline.toISOString()} (${slaHours}h)`,
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // CRON: Every 5 min → Check all tickets past their SLA deadline
  // ──────────────────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runEscalationScheduler() {
    this.logger.log('[SLA] Running escalation scheduler...');

    const overdueTickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['RESOLVED', 'CLOSED', 'ESCALATED'] },
        slaDeadline: { lt: new Date() },
      },
      include: {
        category: {
          include: { slaRules: { include: { escalationRole: true } } },
        },
        escalations: {
          where: { resolvedAt: null },
          orderBy: { escalationLevel: 'desc' },
          take: 1,
        },
      },
    });

    for (const ticket of overdueTickets) {
      const currentLevel =
        ticket.escalations.length > 0 ? ticket.escalations[0].escalationLevel : 0;
      const nextLevel = currentLevel + 1;

      // Determine the target staff from SLA rules
      const slaRule = ticket.category?.slaRules?.[0];
      const hoursBreached = slaRule
        ? this.getHoursBreached(ticket.slaDeadline!)
        : 0;

      // Level 1 escalation trigger
      const level1Threshold = slaRule?.escalationLevel1Hours ?? 0;
      // Level 2 escalation trigger
      const level2Threshold = slaRule?.escalationLevel2Hours ?? 0;

      let targetLevel: number | null = null;
      if (currentLevel < 2 && level2Threshold > 0 && hoursBreached >= level2Threshold) {
        targetLevel = 2;
      } else if (currentLevel < 1 && level1Threshold > 0 && hoursBreached >= level1Threshold) {
        targetLevel = 1;
      } else if (currentLevel === 0) {
        targetLevel = 1; // Always escalate at least to level 1 when overdue
      }

      if (targetLevel === null) continue;

      // Find a staff member with the escalation role (simplest: first match)
      const staffToEscalate = await this.prisma.staffUser.findFirst({
        where: {
          roleId: slaRule?.escalationRoleId ?? undefined,
          isActive: true,
        },
      });

      if (!staffToEscalate) {
        this.logger.warn(
          `[SLA] No staff found for escalation on ticket ${ticket.ticketNumber}`,
        );
        continue;
      }

      // Create Escalation record
      await this.prisma.escalation.create({
        data: {
          ticketId: ticket.id,
          escalationLevel: targetLevel,
          escalatedTo: staffToEscalate.id,
          escalatedAt: new Date(),
        },
      });

      // Update ticket status to ESCALATED
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'ESCALATED' },
      });

      // Write audit log
      await this.prisma.ticketLog.create({
        data: {
          ticketId: ticket.id,
          actionType: 'ESCALATED',
          oldValue: { status: ticket.status },
          newValue: { status: 'ESCALATED', escalationLevel: targetLevel },
          actorType: 'SYSTEM',
        },
      });

      this.logger.warn(
        `[SLA] Ticket ${ticket.ticketNumber} escalated to level ${targetLevel} → ${staffToEscalate.fullName}`,
      );

      this.eventEmitter.emit(
        'ticket.escalated',
        new TicketEscalatedEvent(ticket.id, ticket.slaDeadline!),
      );
    }

    this.logger.log(`[SLA] Scheduler done. Processed ${overdueTickets.length} overdue tickets.`);
  }

  // ──────────────────────────────────────────────────────────────────
  // READS (for API/Controller)
  // ──────────────────────────────────────────────────────────────────

  /** List all SLA rules, with category info */
  async getRules(page = 1, limit = 10): Promise<PaginatedResult<any>> {
    const where = { deletedAt: null };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.slaRule.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.slaRule.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  /** List all active escalations */
  async getEscalations(page = 1, limit = 10): Promise<PaginatedResult<any>> {
    const where = { resolvedAt: null, deletedAt: null };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.escalation.findMany({
        where,
        include: {
          ticket: { select: { id: true, ticketNumber: true, status: true, slaDeadline: true } },
          escalatedToUser: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { escalatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.escalation.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  /** Get all tickets currently breaching SLA */
  async getOverdueTickets(page = 1, limit = 10): Promise<PaginatedResult<any>> {
    const where = {
      deletedAt: null,
      status: { notIn: ['RESOLVED', 'CLOSED'] as any[] },
      slaDeadline: { lt: new Date() },
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, phoneNumber: true } },
        },
        orderBy: { slaDeadline: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  /** Resolve an escalation manually */
  async resolveEscalation(escalationId: string) {
    return this.prisma.escalation.update({
      where: { id: escalationId },
      data: { resolvedAt: new Date() },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // ADMIN: SLA Rule CRUD (used by CMS)
  // ──────────────────────────────────────────────────────────────────

  /** Create a new SLA rule for a category */
  async createRule(dto: CreateSlaRuleDto) {
    return this.prisma.slaRule.create({
      data: {
        categoryId: dto.categoryId,
        maxHours: dto.maxHours,
        escalationLevel1Hours: dto.escalationLevel1Hours,
        escalationLevel2Hours: dto.escalationLevel2Hours,
        escalationRoleId: dto.escalationRoleId,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  /** Get a single SLA rule */
  async findOneRule(id: string) {
    const rule = await this.prisma.slaRule.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        escalationRole: { select: { id: true, name: true } },
      },
    });
    if (!rule) throw new NotFoundException(`SLA Rule #${id} tidak ditemukan`);
    return rule;
  }

  /** Update a SLA rule */
  async updateRule(id: string, dto: UpdateSlaRuleDto) {
    await this.findOneRule(id);
    return this.prisma.slaRule.update({ where: { id }, data: dto });
  }

  /** Soft-delete a SLA rule */
  async removeRule(id: string) {
    await this.findOneRule(id);
    return this.prisma.slaRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────
  private getHoursBreached(deadline: Date): number {
    return Math.floor((Date.now() - deadline.getTime()) / (1000 * 60 * 60));
  }
}
