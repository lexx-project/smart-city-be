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
import { AgencyService } from './agency.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@ApiTags('Agencies')
@ApiBearerAuth('jwt-auth')
@Controller('agencies')
export class AgencyController {
    constructor(private readonly agencyService: AgencyService) { }

    @Post()
    @ApiOperation({
        summary: 'Buat dinas baru',
        description: 'Membuat data dinas / instansi pemerintah baru ke dalam sistem.',
    })
    @ApiResponse({
        status: 201,
        description: 'Dinas berhasil dibuat.',
        schema: {
            example: {
                id: 'uuid',
                name: 'Dinas Perhubungan Kota Bandung',
                description: 'Dinas yang mengelola transportasi kota',
                contactEmail: 'info@dishub.bandung.go.id',
                contactPhone: '022-12345678',
                isActive: true,
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    @ApiResponse({ status: 401, description: 'Tidak terautentikasi.' })
    create(@Body() dto: CreateAgencyDto) {
        return this.agencyService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Daftar semua dinas',
        description: 'Mengambil daftar semua dinas yang terdaftar, dengan opsi pencarian dan pagination.',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Filter dinas berdasarkan nama (case-insensitive)',
        example: 'perhubungan',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    @ApiResponse({
        status: 200,
        description: 'Daftar dinas berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        name: 'Dinas Perhubungan Kota Bandung',
                        description: 'Dinas yang mengelola transportasi kota',
                        contactEmail: 'info@dishub.bandung.go.id',
                        contactPhone: '022-12345678',
                        isActive: true,
                        createdAt: '2024-01-01T00:00:00.000Z',
                        _count: {
                            categories: 12,
                            staffUsers: 45,
                        },
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
    @ApiResponse({ status: 401, description: 'Tidak terautentikasi.' })
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.agencyService.findAll(
            search,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Detail dinas',
        description: 'Mengambil detail satu dinas beserta data staff dan kategori yang dimiliki.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID dinas yang ingin dilihat',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail dinas berhasil diambil.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Dinas Perhubungan Kota Bandung',
                description: 'Dinas yang mengelola transportasi kota',
                contactEmail: 'info@dishub.bandung.go.id',
                contactPhone: '022-12345678',
                isActive: true,
                createdAt: '2024-01-01T00:00:00.000Z',
                categories: [
                    {
                        id: 'cat-uuid-1',
                        name: 'Lalu Lintas',
                        level: 1,
                        parentId: null,
                    },
                ],
                staffUsers: [
                    {
                        id: 'staff-uuid-1',
                        fullName: 'John Doe',
                        email: 'john@bandung.go.id',
                        role: { name: 'Admin Dinas' },
                    },
                ],
                _count: {
                    categories: 1,
                    staffUsers: 1,
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    findOne(@Param('id') id: string) {
        return this.agencyService.findOne(id);
    }

    @Get(':id/categories')
    @ApiOperation({
        summary: 'Pohon kategori dinas',
        description:
            'Mengambil seluruh pohon hierarki kategori layanan yang dimiliki oleh dinas tertentu.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID dinas',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Pohon kategori berhasil diambil.',
        schema: {
            example: [
                {
                    id: 'cat-uuid-1',
                    name: 'Lalu Lintas',
                    level: 1,
                    parentId: null,
                    children: [
                        {
                            id: 'cat-uuid-2',
                            name: 'Marka Jalan',
                            level: 2,
                            parentId: 'cat-uuid-1',
                            children: [],
                        },
                    ],
                },
            ],
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    getCategoryTree(@Param('id') id: string) {
        return this.agencyService.getCategoryTree(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update data dinas',
        description: 'Mengubah sebagian atau seluruh data dinas (partial update).',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID dinas yang akan diupdate',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Dinas berhasil diupdate.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Dinas Perhubungan Kota Bandung (Updated)',
                description: 'Deskripsi yang diperbarui',
                contactEmail: 'new-email@bandung.go.id',
                contactPhone: '022-87654321',
                isActive: true,
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    update(@Param('id') id: string, @Body() dto: UpdateAgencyDto) {
        return this.agencyService.update(id, dto);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({
        summary: 'Toggle status aktif dinas',
        description: 'Mengaktifkan atau menonaktifkan dinas. Status akan berbalik dari kondisi saat ini.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID dinas',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Status dinas berhasil diubah.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Dinas Perhubungan Kota Bandung',
                isActive: false,
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    toggleActive(@Param('id') id: string) {
        return this.agencyService.toggleActive(id);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Hapus dinas (soft delete)',
        description:
            'Menghapus dinas secara soft delete. Dinas yang memiliki staff atau tiket aktif tidak dapat dihapus.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID dinas yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Dinas berhasil dihapus.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Dinas Perhubungan Kota Bandung',
                deletedAt: '2024-01-02T11:00:00.000Z',
                isActive: false,
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    @ApiResponse({ status: 409, description: 'Dinas masih memiliki dependensi aktif.' })
    remove(@Param('id') id: string) {
        return this.agencyService.remove(id);
    }
}
