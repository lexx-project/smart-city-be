import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketCreatedEvent, TicketStatusUpdatedEvent } from 'src/common/events/ticket.events';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { WhatsappService } from 'src/infra/whatsapp/whatsapp.service';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class TicketService {
    private readonly logger = new Logger(TicketService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly whatsapp: WhatsappService,
    ) { }

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────
    async create(createTicketDto: CreateTicketDto) {
        const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const ticket = await this.prisma.ticket.create({
            data: {
                ticketNumber,
                description: createTicketDto.description,
                status: 'OPEN',
                priority: createTicketDto.priority ?? 'MEDIUM',
                userId: createTicketDto.userId,
                categoryId: createTicketDto.categoryId,
            },
        });

        // Log creation
        await this.writeLog(ticket.id, 'CREATED', null, { status: 'OPEN' }, 'SYSTEM');

        this.logger.log(`Ticket created: ${ticket.ticketNumber}`);
        this.eventEmitter.emit(
            'ticket.created',
            new TicketCreatedEvent(ticket.id, ticket.ticketNumber, ticket.categoryId),
        );

        return ticket;
    }

    // ─────────────────────────────────────────────
    // READ (with pagination)
    // ─────────────────────────────────────────────
    async findAll(
        filters?: { status?: string; priority?: string; categoryId?: string },
        page = 1,
        limit = 10,
    ): Promise<PaginatedResult<any>> {
        const where = {
            deletedAt: null,
            ...(filters?.status && { status: filters.status as any }),
            ...(filters?.priority && { priority: filters.priority as any }),
            ...(filters?.categoryId && { categoryId: filters.categoryId }),
        };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    user: { select: { id: true, fullName: true, phoneNumber: true } },
                    assignments: {
                        where: { isActive: true },
                        include: {
                            assignedToUser: { select: { id: true, fullName: true, email: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.ticket.count({ where }),
        ]);

        return paginate(data, total, page, limit);
    }

    async findOne(id: string) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id },
            include: {
                category: true,
                user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
                assignments: {
                    include: {
                        assignedToUser: { select: { id: true, fullName: true, email: true } },
                        assignedByUser: { select: { id: true, fullName: true, email: true } },
                    },
                },
                logs: { orderBy: { createdAt: 'asc' } },
                attachments: true,
                escalations: true,
            },
        });

        if (!ticket) throw new NotFoundException(`Ticket #${id} tidak ditemukan`);
        return ticket;
    }

    // ─────────────────────────────────────────────
    // UPDATE STATUS
    // ─────────────────────────────────────────────
    async updateStatus(id: string, dto: UpdateTicketStatusDto, actorId?: string) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id } });
        if (!ticket) throw new NotFoundException(`Ticket #${id} tidak ditemukan`);

        const oldStatus = ticket.status;

        const updated = await this.prisma.ticket.update({
            where: { id },
            data: {
                status: dto.status,
                ...(dto.status === 'CLOSED' || dto.status === 'RESOLVED'
                    ? { closedAt: new Date() }
                    : {}),
            },
        });

        // Write audit log
        await this.writeLog(
            id,
            'STATUS_CHANGED',
            { status: oldStatus },
            { status: dto.status, note: dto.note },
            actorId ? 'STAFF' : 'SYSTEM',
            actorId,
        );

        this.eventEmitter.emit(
            'ticket.statusUpdated',
            new TicketStatusUpdatedEvent(id, ticket.ticketNumber, String(oldStatus), dto.status),
        );

        this.logger.log(`Ticket ${ticket.ticketNumber}: ${oldStatus} → ${dto.status}`);

        // Send WhatsApp notification to the user
        await this.notifyUserOnStatusChange(updated.id, ticket.ticketNumber, dto.status, dto.note);

        return updated;
    }

    // ─────────────────────────────────────────────
    // ASSIGN
    // ─────────────────────────────────────────────
    async assign(ticketId: string, dto: AssignTicketDto) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException(`Ticket #${ticketId} tidak ditemukan`);

        // Deactivate existing assignments
        await this.prisma.ticketAssignment.updateMany({
            where: { ticketId, isActive: true },
            data: { isActive: false },
        });

        // Create new assignment
        const assignment = await this.prisma.ticketAssignment.create({
            data: {
                ticketId,
                assignedTo: dto.assignedTo,
                assignedBy: dto.assignedBy,
                assignedAt: new Date(),
                isActive: true,
            },
            include: {
                assignedToUser: { select: { id: true, fullName: true, email: true } },
                assignedByUser: { select: { id: true, fullName: true } },
            },
        });

        // Update ticket status to ASSIGNED
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'ASSIGNED' },
        });

        // Write audit log
        await this.writeLog(
            ticketId,
            'ASSIGNED',
            null,
            { assignedTo: dto.assignedTo, assignedBy: dto.assignedBy },
            'STAFF',
            dto.assignedBy,
        );

        this.logger.log(`Ticket ${ticket.ticketNumber} assigned to staff ${dto.assignedTo}`);
        return assignment;
    }

    // ─────────────────────────────────────────────
    // LOGS
    // ─────────────────────────────────────────────
    getLogs(ticketId: string) {
        return this.prisma.ticketLog.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
        });
    }

    private async writeLog(
        ticketId: string,
        actionType: string,
        oldValue: any,
        newValue: any,
        actorType: 'USER' | 'STAFF' | 'SYSTEM',
        actorId?: string,
    ) {
        return this.prisma.ticketLog.create({
            data: {
                ticketId,
                actionType,
                oldValue: oldValue ?? undefined,
                newValue: newValue ?? undefined,
                actorType,
                actorId: actorId ?? null,
            },
        });
    }

    /** Send WA notification + mark notificationSent on the latest log */
    private async notifyUserOnStatusChange(
        ticketId: string,
        ticketNumber: string,
        newStatus: string,
        note?: string,
    ) {
        // Get user phone number via ticket → user relation
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { user: { select: { phoneNumber: true } } },
        });

        if (!ticket?.user?.phoneNumber) return;

        const statusLabel: Record<string, string> = {
            OPEN: 'Dibuka',
            ASSIGNED: 'Ditugaskan ke petugas',
            IN_PROGRESS: 'Sedang diproses',
            RESOLVED: 'Telah diselesaikan',
            CLOSED: 'Ditutup',
            ESCALATED: 'Dieskalasi',
        };

        const label = statusLabel[newStatus] ?? newStatus;
        let message = `📋 *Update Tiket ${ticketNumber}*\n\nStatus: *${label}*`;
        if (note) message += `\nCatatan: ${note}`;
        message += `\n\nTerima kasih telah menggunakan layanan kami.`;

        const result = await this.whatsapp.sendTextMessage(ticket.user.phoneNumber, message);

        // Update the latest log entry with notification status
        const latestLog = await this.prisma.ticketLog.findFirst({
            where: { ticketId, actionType: 'STATUS_CHANGED' },
            orderBy: { createdAt: 'desc' },
        });

        if (latestLog) {
            await this.prisma.ticketLog.update({
                where: { id: latestLog.id },
                data: {
                    notificationSent: result.success,
                    notificationSentAt: result.success ? new Date() : null,
                },
            });
        }

        this.logger.log(
            `[WA Notify] Ticket ${ticketNumber} → ${ticket.user.phoneNumber}: ${result.success ? 'sent' : 'failed'}`,
        );
    }

    // ─────────────────────────────────────────────
    // ATTACHMENTS
    // ─────────────────────────────────────────────
    async addAttachment(ticketId: string, dto: AddAttachmentDto) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException(`Ticket #${ticketId} tidak ditemukan`);

        const attachment = await this.prisma.ticketAttachment.create({
            data: {
                ticketId,
                fileUrl: dto.fileUrl,
                fileType: dto.fileType,
                uploadedBy: dto.uploadedBy ?? null,
            },
        });

        await this.writeLog(ticketId, 'ATTACHMENT_ADDED', null, { fileUrl: dto.fileUrl }, 'USER', dto.uploadedBy);
        return attachment;
    }

    getAttachments(ticketId: string) {
        return this.prisma.ticketAttachment.findMany({
            where: { ticketId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ─────────────────────────────────────────────
    // SOFT DELETE
    // ─────────────────────────────────────────────
    async remove(id: string) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id } });
        if (!ticket) throw new NotFoundException(`Ticket #${id} tidak ditemukan`);

        return this.prisma.ticket.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
