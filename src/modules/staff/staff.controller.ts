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
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Staff')
@ApiBearerAuth('jwt-auth')
@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Post()
    @ApiOperation({
        summary: 'Buat akun staff baru',
        description:
            'Membuat akun petugas layanan baru. Password akan otomatis di-hash sebelum disimpan.',
    })
    @ApiResponse({
        status: 201,
        description: 'Akun staff berhasil dibuat.',
        schema: {
            example: {
                id: 'uuid',
                fullName: 'Budi Santoso',
                email: 'budi@dishub.go.id',
                phone: '081234567890',
                isActive: true,
                role: { id: 'uuid', name: 'OPERATOR' },
                agency: { id: 'uuid', name: 'Dinas Perhubungan' },
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    @ApiResponse({ status: 409, description: 'Email sudah digunakan.' })
    create(@Body() dto: CreateStaffDto) {
        return this.staffService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Daftar staff',
        description:
            'Mengambil daftar semua staff dengan opsi filter berdasarkan dinas, role, dan pencarian nama/email.',
    })
    @ApiQuery({
        name: 'agencyId',
        required: false,
        description: 'Filter berdasarkan UUID dinas',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'roleId',
        required: false,
        description: 'Filter berdasarkan UUID role',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Cari berdasarkan nama atau email staff',
        example: 'budi',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar staff berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        fullName: 'Budi Santoso',
                        email: 'budi@example.com',
                        phone: '08123456789',
                        isActive: true,
                        createdAt: '2024-01-01T00:00:00.000Z',
                        agency: { id: 'uuid', name: 'Dinas Perhubungan' },
                        role: { id: 'uuid', name: 'OPERATOR' },
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
    findAll(
        @Query('agencyId') agencyId?: string,
        @Query('roleId') roleId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.staffService.findAll(
            { agencyId, roleId, search },
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get('roles')
    @ApiOperation({
        summary: 'Daftar role staff',
        description: 'Mengambil semua role yang tersedia untuk ditampilkan pada form dropdown CMS.',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar role berhasil diambil.',
        schema: {
            example: [
                { id: 'uuid', name: 'SUPER_ADMIN' },
                { id: 'uuid', name: 'ADMIN' },
                { id: 'uuid', name: 'SUPERVISOR' },
                { id: 'uuid', name: 'OPERATOR' },
            ],
        },
    })
    getRoles() {
        return this.staffService.getRoles();
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Detail staff',
        description: 'Mengambil detail satu staff beserta tiket yang sedang ditangani.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID staff',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail staff berhasil diambil.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                fullName: 'Budi Santoso',
                email: 'budi@dishub.go.id',
                phone: '081234567890',
                isActive: true,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                agency: { id: 'agency-uuid', name: 'Dinas Perhubungan' },
                role: { id: 'role-uuid', name: 'OPERATOR' },
                assignedTickets: [
                    {
                        isActive: true,
                        ticket: {
                            id: 'ticket-uuid',
                            ticketNumber: 'TKT-2024-001',
                            status: 'IN_PROGRESS',
                        },
                    },
                ],
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Staff tidak ditemukan.' })
    findOne(@Param('id') id: string) {
        return this.staffService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update data staff',
        description: 'Mengubah informasi profil staff (partial update). Field password tidak bisa diubah di sini.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID staff yang akan diupdate',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Data staff berhasil diupdate.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                fullName: 'Budi Santoso (Updated)',
                email: 'budi-new@dishub.go.id',
                phone: '081234567891',
                isActive: true,
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Staff tidak ditemukan.' })
    update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
        return this.staffService.update(id, dto);
    }

    @Patch(':id/password')
    @ApiOperation({
        summary: 'Ganti password staff',
        description: 'Mengubah password akun staff. Password baru akan di-hash sebelum disimpan.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID staff',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Password berhasil diubah.',
        schema: {
            example: {
                message: 'Password berhasil diubah',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Staff tidak ditemukan.' })
    changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
        return this.staffService.changePassword(id, dto);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({
        summary: 'Toggle status aktif staff',
        description: 'Mengaktifkan atau menonaktifkan akun staff. Staff yang dinonaktifkan tidak dapat login.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID staff',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Status staff berhasil diubah.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                fullName: 'Budi Santoso',
                isActive: false,
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Staff tidak ditemukan.' })
    toggleActive(@Param('id') id: string) {
        return this.staffService.toggleActive(id);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Hapus staff (soft delete)',
        description:
            'Menghapus akun staff secara soft delete. Staff yang masih menangani tiket aktif tidak dapat dihapus.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID staff yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Staff berhasil dihapus.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                fullName: 'Budi Santoso',
                isActive: false,
                deletedAt: '2024-01-02T11:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Staff tidak ditemukan.' })
    @ApiResponse({ status: 409, description: 'Staff masih menangani tiket aktif.' })
    remove(@Param('id') id: string) {
        return this.staffService.remove(id);
    }
}
