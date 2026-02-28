import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { CreateSlaRuleDto } from './dto/create-sla-rule.dto';
import { UpdateSlaRuleDto } from './dto/update-sla-rule.dto';

@ApiTags('SLA')
@ApiBearerAuth('jwt-auth')
@Controller('sla')
export class SlaController {
    constructor(private readonly slaService: SlaService) { }

    // ─── Monitoring ───────────────────────────────────────────────────

    @Get('overdue')
    @ApiOperation({
        summary: 'Tiket SLA terlampaui',
        description:
            'Mengambil daftar semua tiket yang sudah melampaui batas waktu SLA-nya (deadline terlewat dan belum selesai).',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar tiket overdue berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        ticketNumber: 'TKT-2024-001',
                        slaDeadline: '2024-01-02T00:00:00.000Z',
                        status: 'IN_PROGRESS',
                        category: { id: 'uuid', name: 'Jalan Rusak' },
                        user: { id: 'uuid', fullName: 'John Doe', phoneNumber: '08123' },
                    },
                ],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            },
        },
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    getOverdueTickets(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.slaService.getOverdueTickets(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get('escalations')
    @ApiOperation({
        summary: 'Daftar eskalasi aktif',
        description: 'Mengambil semua eskalasi SLA yang belum diselesaikan.',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar eskalasi berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        level: 1,
                        escalatedAt: '2024-01-01T06:00:00.000Z',
                        resolvedAt: null,
                        ticket: { id: 'uuid', ticketNumber: 'TKT-001', status: 'OPEN', slaDeadline: '...' },
                        escalatedToUser: { id: 'uuid', fullName: 'Supervisor Name', email: '...' },
                    },
                ],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            }
        },
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    getEscalations(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.slaService.getEscalations(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Patch('escalations/:id/resolve')
    @ApiOperation({
        summary: 'Selesaikan eskalasi',
        description: 'Menandai satu eskalasi SLA sebagai sudah diselesaikan.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID eskalasi yang akan diselesaikan',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Eskalasi berhasil diselesaikan.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                ticketId: 'ticket-uuid',
                escalationLevel: 1,
                escalatedTo: 'staff-uuid',
                escalatedAt: '2024-01-01T06:00:00.000Z',
                resolvedAt: '2024-01-01T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Eskalasi tidak ditemukan.' })
    resolveEscalation(@Param('id') id: string) {
        return this.slaService.resolveEscalation(id);
    }

    // ─── Admin: SLA Rules CRUD ────────────────────────────────────────

    @Get('rules')
    @ApiOperation({
        summary: 'Daftar aturan SLA',
        description: 'Mengambil semua aturan SLA yang dikonfigurasi per kategori layanan.',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar aturan SLA berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        category: { id: 'uuid', name: 'Pengaduan Jalan Rusak' },
                        maxHours: 72,
                        escalationLevel1Hours: 24,
                        escalationLevel2Hours: 48,
                    },
                ],
                meta: {
                    total: 5,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            },
        },
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    getRules(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.slaService.getRules(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Post('rules')
    @ApiOperation({
        summary: 'Buat aturan SLA baru',
        description:
            'Membuat aturan SLA baru untuk kategori tertentu. Setiap kategori hanya boleh memiliki satu aturan SLA aktif.',
    })
    @ApiResponse({
        status: 201,
        description: 'Aturan SLA berhasil dibuat.',
        schema: {
            example: {
                id: 'rule-uuid',
                categoryId: 'cat-uuid',
                maxHours: 72,
                escalationLevel1Hours: 24,
                escalationLevel2Hours: 48,
                escalationRoleId: 'role-uuid',
                createdAt: '2024-01-01T00:00:00.000Z',
                category: { id: 'cat-uuid', name: 'Pengaduan Jalan Rusak' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    @ApiResponse({ status: 409, description: 'Kategori ini sudah memiliki aturan SLA.' })
    createRule(@Body() dto: CreateSlaRuleDto) {
        return this.slaService.createRule(dto);
    }

    @Get('rules/:id')
    @ApiOperation({
        summary: 'Detail aturan SLA',
        description: 'Mengambil detail satu aturan SLA berdasarkan ID-nya.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID aturan SLA',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail aturan SLA berhasil diambil.',
        schema: {
            example: {
                id: 'rule-uuid',
                categoryId: 'cat-uuid',
                maxHours: 72,
                escalationLevel1Hours: 24,
                escalationLevel2Hours: 48,
                escalationRoleId: 'role-uuid',
                category: { id: 'cat-uuid', name: 'Pengaduan Jalan Rusak' },
                escalationRole: { id: 'role-uuid', name: 'Supervisor' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Aturan SLA tidak ditemukan.' })
    findOneRule(@Param('id') id: string) {
        return this.slaService.findOneRule(id);
    }

    @Patch('rules/:id')
    @ApiOperation({
        summary: 'Update aturan SLA',
        description: 'Mengubah konfigurasi aturan SLA yang sudah ada (partial update).',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID aturan SLA yang akan diupdate',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Aturan SLA berhasil diupdate.',
        schema: {
            example: {
                id: 'rule-uuid',
                maxHours: 48,
                escalationLevel1Hours: 12,
                updatedAt: '2024-01-02T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Aturan SLA tidak ditemukan.' })
    updateRule(@Param('id') id: string, @Body() dto: UpdateSlaRuleDto) {
        return this.slaService.updateRule(id, dto);
    }

    @Delete('rules/:id')
    @ApiOperation({
        summary: 'Hapus aturan SLA',
        description: 'Menghapus aturan SLA. Tiket yang sudah dibuat tidak terpengaruh.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID aturan SLA yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Aturan SLA berhasil dihapus.',
        schema: {
            example: {
                id: 'rule-uuid',
                deletedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Aturan SLA tidak ditemukan.' })
    removeRule(@Param('id') id: string) {
        return this.slaService.removeRule(id);
    }
}
