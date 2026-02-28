import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/infra/database/prisma.service';
import {
  TicketCreatedEvent,
  TicketStatusUpdatedEvent,
} from 'src/common/events/ticket.events';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ──────────────────────────────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────────────────────────────

  @OnEvent('ticket.created')
  async handleTicketCreated(event: TicketCreatedEvent) {
    this.logger.log(`[Analytics] ticket.created: ${event.ticketNumber}`);
    const today = this.getToday();

    await this.prisma.dailyMetric.upsert({
      where: { date: today },
      update: { totalTickets: { increment: 1 } },
      create: {
        date: today,
        totalMessages: 0,
        totalTickets: 1,
        resolvedTickets: 0,
        avgResolutionTime: 0,
        slaComplianceRate: 100,
      },
    });
  }

  @OnEvent('ticket.statusUpdated')
  async handleStatusUpdated(event: TicketStatusUpdatedEvent) {
    const isResolved = event.newStatus === 'RESOLVED' || event.newStatus === 'CLOSED';
    if (!isResolved) return;

    this.logger.log(`[Analytics] ticket resolved: ${event.ticketId}`);
    const today = this.getToday();

    // Get ticket to calculate resolution time
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: event.ticketId },
      select: { createdAt: true, closedAt: true },
    });

    const resolutionHours = ticket?.createdAt
      ? Math.round(((ticket.closedAt ?? new Date()).getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60))
      : 0;

    const metric = await this.prisma.dailyMetric.findUnique({ where: { date: today } });
    const existingResolved = metric?.resolvedTickets ?? 0;
    const existingAvg = metric?.avgResolutionTime ?? 0;
    const newAvg = existingResolved > 0
      ? (existingAvg * existingResolved + resolutionHours) / (existingResolved + 1)
      : resolutionHours;

    await this.prisma.dailyMetric.upsert({
      where: { date: today },
      update: {
        resolvedTickets: { increment: 1 },
        avgResolutionTime: newAvg,
      },
      create: {
        date: today,
        totalMessages: 0,
        totalTickets: 1,
        resolvedTickets: 1,
        avgResolutionTime: resolutionHours,
        slaComplianceRate: 100,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // CRON: Recalculate SLA compliance rate every hour
  // ──────────────────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateSlaCompliance() {
    this.logger.log('[Analytics] Recalculating SLA compliance...');
    const today = this.getToday();

    const [totalToday, escalatedToday] = await Promise.all([
      this.prisma.ticket.count({ where: { createdAt: { gte: today } } }),
      this.prisma.ticket.count({
        where: { createdAt: { gte: today }, status: 'ESCALATED' },
      }),
    ]);

    const complianceRate =
      totalToday > 0
        ? Math.round(((totalToday - escalatedToday) / totalToday) * 100)
        : 100;

    await this.prisma.dailyMetric.upsert({
      where: { date: today },
      update: { slaComplianceRate: complianceRate },
      create: {
        date: today,
        totalMessages: 0,
        totalTickets: totalToday,
        resolvedTickets: 0,
        avgResolutionTime: 0,
        slaComplianceRate: complianceRate,
      },
    });

    this.logger.log(`[Analytics] SLA compliance today: ${complianceRate}%`);
  }

  // ──────────────────────────────────────────────────────────────────
  // READS (for Dashboard)
  // ──────────────────────────────────────────────────────────────────

  /** High-level summary stats for the dashboard header */
  async getOverview() {
    const [ticketCounts, slaData, trends] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.prisma.dailyMetric.aggregate({
        _avg: { slaComplianceRate: true },
        where: { date: { gte: this.daysAgo(30) } },
      }),
      this.prisma.dailyMetric.aggregate({
        _sum: { totalTickets: true, resolvedTickets: true },
        _avg: { avgResolutionTime: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    ticketCounts.forEach((g) => {
      statusMap[g.status] = g._count.id;
    });

    return {
      totalTickets: trends._sum.totalTickets ?? 0,
      totalResolved: trends._sum.resolvedTickets ?? 0,
      avgResolutionTimeHours: Math.round(trends._avg.avgResolutionTime ?? 0),
      slaComplianceRate: Math.round(slaData._avg.slaComplianceRate ?? 100),
      byStatus: statusMap,
    };
  }

  /** 7-day trend data for charts */
  getTrendData(days = 7) {
    return this.prisma.dailyMetric.findMany({
      orderBy: { date: 'desc' },
      take: days,
    });
  }

  /** Per-category breakdown */
  async getCategoryBreakdown() {
    return this.prisma.ticket.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      where: { deletedAt: null },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────
  private getToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  }
}
