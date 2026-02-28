import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('jwt-auth')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    @ApiOperation({
        summary: 'Buat kategori baru',
        description:
            'Membuat kategori layanan baru. Kategori dapat bersifat root (tidak memiliki induk) atau sub-kategori dari kategori lain.',
    })
    @ApiResponse({
        status: 201,
        description: 'Kategori berhasil dibuat.',
        schema: {
            example: {
                id: 'uuid',
                name: 'Pengaduan Jalan Rusak',
                agencyId: 'uuid',
                parentId: null,
                defaultSlaHours: 24,
                isActive: true,
                sortOrder: 1,
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    create(@Body() dto: CreateCategoryDto) {
        return this.categoryService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Daftar kategori',
        description:
            'Mengambil daftar kategori dengan opsi filter dan pencarian. ' +
            'Gunakan `parentId=root` untuk hanya mengambil kategori tingkat pertama.',
    })
    @ApiQuery({
        name: 'agencyId',
        required: false,
        description: 'Filter berdasarkan UUID dinas pemilik kategori',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({
        name: 'parentId',
        required: false,
        description:
            'Filter berdasarkan induk. Gunakan nilai `root` untuk hanya menampilkan kategori tingkat pertama.',
        example: 'root',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Cari berdasarkan nama kategori (case-insensitive)',
        example: 'kebersihan',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    @ApiResponse({
        status: 200,
        description: 'Daftar kategori berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        name: 'Layanan Kebersihan',
                        agencyId: 'uuid',
                        parentId: null,
                        level: 0,
                        sortOrder: 1,
                        agency: { id: 'uuid', name: 'Dinas LH' },
                        _count: { children: 2, tickets: 15 },
                    },
                ],
                meta: {
                    total: 10,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            },
        },
    })
    findAll(
        @Query('agencyId') agencyId?: string,
        @Query('parentId') parentId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.categoryService.findAll(
            { agencyId, parentId, search },
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get('tree/:agencyId')
    @ApiOperation({
        summary: 'Pohon kategori lengkap per dinas',
        description:
            'Mengambil seluruh hierarki kategori dalam format pohon (nested) untuk dinas tertentu.',
    })
    @ApiParam({
        name: 'agencyId',
        description: 'UUID dinas yang pohon kategorinya ingin diambil',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Pohon kategori berhasil diambil.',
        schema: {
            example: [
                {
                    id: 'uuid',
                    name: 'Infrastruktur',
                    children: [
                        { id: 'uuid', name: 'Jalan Rusak', children: [] },
                        { id: 'uuid', name: 'Drainase', children: [] },
                    ],
                },
            ],
        },
    })
    @ApiResponse({ status: 404, description: 'Dinas tidak ditemukan.' })
    getTree(@Param('agencyId') agencyId: string) {
        return this.categoryService.getTree(agencyId);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Detail kategori',
        description: 'Mengambil detail satu kategori berdasarkan ID-nya.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID kategori',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail kategori berhasil diambil.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Pengaduan Jalan Rusak',
                description: 'Kategori untuk laporan jalan berlubang atau rusak',
                agencyId: 'agency-uuid',
                parentId: 'parent-uuid',
                level: 1,
                sortOrder: 1,
                isActive: true,
                defaultSlaHours: 24,
                agency: { id: 'agency-uuid', name: 'Dinas PU' },
                parent: { id: 'parent-uuid', name: 'Infrastruktur', level: 0 },
                children: [],
                slaRules: [],
                _count: { children: 0, tickets: 5 },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
    findOne(@Param('id') id: string) {
        return this.categoryService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update kategori',
        description: 'Mengubah data kategori (partial update).',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID kategori yang akan diupdate',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Kategori berhasil diupdate.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Pengaduan Jalan Rusak (Updated)',
                description: 'Deskripsi baru',
                isActive: true,
                sortOrder: 2,
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
    update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categoryService.update(id, dto);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({
        summary: 'Toggle status aktif kategori',
        description:
            'Mengaktifkan atau menonaktifkan kategori. Kategori yang dinonaktifkan tidak muncul di form pengaduan warga.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID kategori',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Status kategori berhasil diubah.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Pengaduan Jalan Rusak',
                isActive: false,
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
    toggleActive(@Param('id') id: string) {
        return this.categoryService.toggleActive(id);
    }

    @Put('reorder')
    @ApiOperation({
        summary: 'Ubah urutan tampil kategori',
        description: 'Mengatur ulang urutan tampil (sortOrder) untuk beberapa kategori sekaligus.',
    })
    @ApiBody({
        description: 'Array berisi ID kategori dan sortOrder baru masing-masing',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
                    sortOrder: { type: 'integer', example: 1 },
                },
                required: ['id', 'sortOrder'],
            },
            example: [
                { id: 'uuid-1', sortOrder: 1 },
                { id: 'uuid-2', sortOrder: 2 },
                { id: 'uuid-3', sortOrder: 3 },
            ],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Urutan kategori berhasil diubah.',
        schema: {
            example: {
                message: '3 kategori berhasil diurutkan ulang',
            },
        },
    })
    reorder(@Body() items: { id: string; sortOrder: number }[]) {
        return this.categoryService.reorder(items);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Hapus kategori (soft delete)',
        description:
            'Menghapus kategori secara soft delete. Akan gagal jika masih memiliki sub-kategori atau tiket aktif.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID kategori yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Kategori berhasil dihapus.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Pengaduan Jalan Rusak',
                deletedAt: '2024-01-02T11:00:00.000Z',
                isActive: false,
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
    @ApiResponse({
        status: 409,
        description: 'Kategori masih memiliki sub-kategori atau tiket aktif.',
    })
    remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }
}
