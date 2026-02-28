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
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';

@ApiTags('Tickets')
@ApiBearerAuth('jwt-auth')
@Controller('tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) { }

    @Post()
    @ApiOperation({
        summary: 'Buat tiket pengaduan baru',
        description:
            'Membuat tiket pengaduan / permohonan layanan baru dari warga. ' +
            'Sistem akan otomatis menghitung deadline SLA berdasarkan kategori yang dipilih.',
    })
    @ApiResponse({
        status: 201,
        description: 'Tiket berhasil dibuat.',
        schema: {
            example: {
                id: 'uuid',
                ticketNumber: 'TKT-2024-001',
                description: 'Terdapat lubang besar di Jalan Sudirman',
                status: 'OPEN',
                priority: 'MEDIUM',
                slaDeadline: '2024-01-03T00:00:00.000Z',
                user: { id: 'uuid', fullName: 'Siti Aminah' },
                category: { id: 'uuid', name: 'Pengaduan Jalan Rusak' },
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    create(@Body() dto: CreateTicketDto) {
        return this.ticketService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Daftar tiket',
        description:
            'Mengambil semua tiket dengan opsi filter berdasarkan status, prioritas, dan kategori.',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        description: 'Filter berdasarkan status tiket',
        enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'],
        example: 'OPEN',
    })
    @ApiQuery({
        name: 'priority',
        required: false,
        description: 'Filter berdasarkan prioritas tiket',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        example: 'HIGH',
    })
    @ApiQuery({
        name: 'categoryId',
        required: false,
        description: 'Filter berdasarkan UUID kategori',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar tiket berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        ticketNumber: 'TKT-1709123456789-123',
                        description: 'Ada aspal berlubang di Jalan Merdeka',
                        status: 'OPEN',
                        priority: 'HIGH',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        category: { id: 'uuid', name: 'Jalan Rusak' },
                        user: { id: 'uuid', fullName: 'John Doe', phoneNumber: '08123456789' },
                        assignments: [],
                    },
                ],
                meta: {
                    total: 25,
                    page: 1,
                    limit: 10,
                    totalPages: 3,
                    hasNextPage: true,
                    hasPrevPage: false,
                },
            },
        },
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    findAll(
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('categoryId') categoryId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.ticketService.findAll(
            { status, priority, categoryId },
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Detail tiket',
        description:
            'Mengambil detail satu tiket beserta log perubahan status, lampiran, dan informasi SLA.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail tiket berhasil diambil.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                ticketNumber: 'TKT-1709123456789-123',
                description: 'Terdapat lubang besar di Jalan Sudirman',
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                slaDeadline: '2024-01-03T00:00:00.000Z',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T10:00:00.000Z',
                category: {
                    id: 'cat-uuid',
                    name: 'Pengaduan Jalan Rusak',
                    defaultSlaHours: 48,
                },
                user: {
                    id: 'user-uuid',
                    fullName: 'Siti Aminah',
                    phoneNumber: '08123456789',
                    email: 'siti@example.com',
                },
                assignments: [
                    {
                        id: 'assign-uuid',
                        assignedAt: '2024-01-01T01:00:00.000Z',
                        isActive: true,
                        assignedToUser: { id: 'staff-uuid', fullName: 'Budi Santoso', email: 'budi@dishub.go.id' },
                        assignedByUser: { id: 'admin-uuid', fullName: 'Admin System', email: 'admin@system.id' },
                    },
                ],
                logs: [
                    {
                        id: 'log-uuid',
                        actionType: 'STATUS_CHANGED',
                        oldValue: { status: 'OPEN' },
                        newValue: { status: 'IN_PROGRESS', note: 'Petugas sedang meluncur' },
                        actorType: 'STAFF',
                        createdAt: '2024-01-01T10:00:00.000Z',
                    },
                ],
                attachments: [
                    {
                        id: 'attach-uuid',
                        fileUrl: 'https://storage.id/foto-jalan.jpg',
                        fileType: 'image/jpeg',
                        uploadedAt: '2024-01-01T00:05:00.000Z',
                    },
                ],
                escalations: [],
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    findOne(@Param('id') id: string) {
        return this.ticketService.findOne(id);
    }

    @Patch(':id/status')
    @ApiOperation({
        summary: 'Update status tiket',
        description:
            'Mengubah status tiket. Setiap perubahan status akan dicatat dalam log riwayat tiket.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket yang statusnya akan diubah',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Status tiket berhasil diubah.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                ticketNumber: 'TKT-1709123456789-123',
                status: 'RESOLVED',
                closedAt: '2024-01-02T15:00:00.000Z',
                updatedAt: '2024-01-02T15:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    @ApiResponse({ status: 422, description: 'Transisi status tidak valid.' })
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateTicketStatusDto,
    ) {
        return this.ticketService.updateStatus(id, dto);
    }

    @Post(':id/assign')
    @ApiOperation({
        summary: 'Tugaskan tiket ke staff',
        description:
            'Menugaskan tiket kepada staff petugas tertentu. Status tiket akan berubah menjadi ASSIGNED secara otomatis.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket yang akan ditugaskan',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 201,
        description: 'Tiket berhasil ditugaskan.',
        schema: {
            example: {
                id: 'assign-uuid',
                ticketId: '550e8400-e29b-41d4-a716-446655440000',
                assignedTo: 'staff-uuid',
                assignedBy: 'admin-uuid',
                assignedAt: '2024-01-02T09:00:00.000Z',
                isActive: true,
                assignedToUser: { id: 'staff-uuid', fullName: 'Budi Santoso', email: 'budi@dishub.go.id' },
                assignedByUser: { id: 'admin-uuid', fullName: 'Admin System' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket atau staff tidak ditemukan.' })
    assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
        return this.ticketService.assign(id, dto);
    }

    @Get(':id/logs')
    @ApiOperation({
        summary: 'Riwayat log tiket',
        description:
            'Mengambil seluruh riwayat perubahan status tiket secara kronologis beserta catatan dan aktor perubahan.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Log tiket berhasil diambil.',
        schema: {
            example: [
                {
                    id: 'log-uuid-1',
                    actionType: 'CREATED',
                    oldValue: null,
                    newValue: { status: 'OPEN' },
                    actorType: 'SYSTEM',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
                {
                    id: 'log-uuid-2',
                    actionType: 'STATUS_CHANGED',
                    oldValue: { status: 'OPEN' },
                    newValue: { status: 'ASSIGNED', note: 'Ditugaskan ke Budi' },
                    actorType: 'STAFF',
                    createdAt: '2024-01-01T01:00:00.000Z',
                },
            ],
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    getLogs(@Param('id') id: string) {
        return this.ticketService.getLogs(id);
    }

    @Post(':id/attachments')
    @ApiOperation({
        summary: 'Tambah lampiran tiket',
        description: 'Menambahkan file lampiran pada tiket (foto, dokumen, dll).',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket yang akan diberi lampiran',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 201,
        description: 'Lampiran berhasil ditambahkan.',
        schema: {
            example: {
                id: 'attach-uuid',
                ticketId: '550e8400-e29b-41d4-a716-446655440000',
                fileUrl: 'https://storage.id/foto-bukti.jpg',
                fileType: 'image/jpeg',
                uploadedBy: 'user-uuid',
                createdAt: '2024-01-02T11:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    addAttachment(@Param('id') id: string, @Body() dto: AddAttachmentDto) {
        return this.ticketService.addAttachment(id, dto);
    }

    @Get(':id/attachments')
    @ApiOperation({
        summary: 'Daftar lampiran tiket',
        description: 'Mengambil semua file lampiran yang terkait dengan tiket tertentu.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar lampiran berhasil diambil.',
        schema: {
            example: [
                {
                    id: 'uuid',
                    fileUrl: 'https://storage.smartpublicservice.id/files/foto.jpg',
                    fileType: 'image/jpeg',
                    uploadedAt: '2024-01-01T00:00:00.000Z',
                },
            ],
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    getAttachments(@Param('id') id: string) {
        return this.ticketService.getAttachments(id);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Hapus tiket (soft delete)',
        description: 'Menghapus tiket secara soft delete.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID tiket yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Tiket berhasil dihapus.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                ticketNumber: 'TKT-1709123456789-123',
                deletedAt: '2024-01-02T12:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tiket tidak ditemukan.' })
    remove(@Param('id') id: string) {
        return this.ticketService.remove(id);
    }
}
