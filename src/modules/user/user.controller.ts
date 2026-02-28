import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('jwt-auth')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    @ApiOperation({
        summary: 'Buat data warga baru',
        description:
            'Mendaftarkan warga baru ke dalam sistem. Nomor telepon bersifat wajib dan digunakan sebagai identitas utama.',
    })
    @ApiResponse({
        status: 201,
        description: 'Data warga berhasil dibuat.',
        schema: {
            example: {
                id: 'uuid',
                phoneNumber: '081234567890',
                fullName: 'Siti Aminah',
                email: 'siti@gmail.com',
                nik: '3271234567890001',
                isVerified: false,
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Data tidak valid.' })
    @ApiResponse({ status: 409, description: 'Nomor telepon sudah terdaftar.' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Get()
    @ApiOperation({
        summary: 'Daftar warga',
        description: 'Mengambil daftar semua warga terdaftar dengan opsi pencarian.',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Cari berdasarkan nama, email, nomor telepon, atau NIK warga',
        example: 'siti',
    })
    @ApiResponse({
        status: 200,
        description: 'Daftar warga berhasil diambil.',
        schema: {
            example: {
                data: [
                    {
                        id: 'uuid',
                        fullName: 'Siti Aminah',
                        email: 'siti@example.com',
                        phoneNumber: '08123456789',
                        nik: '320101XXXXXXXXXX',
                        createdAt: '2024-01-01T00:00:00.000Z',
                    },
                ],
                meta: {
                    total: 100,
                    page: 1,
                    limit: 10,
                    totalPages: 10,
                    hasNextPage: true,
                    hasPrevPage: false,
                },
            },
        },
    })
    @ApiQuery({ name: 'page', required: false, description: 'Nomor halaman (default: 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item per halaman (default: 10, max: 100)', example: 10, type: Number })
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.userService.findAll(
            search,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Detail warga',
        description: 'Mengambil detail satu warga berdasarkan ID-nya beserta riwayat tiket.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID warga',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Detail warga berhasil diambil.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                phoneNumber: '081234567890',
                fullName: 'Siti Aminah',
                email: 'siti@gmail.com',
                nik: '3271234567890001',
                emailVerified: '2024-01-01T00:00:00.000Z',
                image: 'https://example.com/avatar.jpg',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Warga tidak ditemukan.' })
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update data warga',
        description: 'Mengubah sebagian atau seluruh data profil warga (partial update).',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID warga yang akan diupdate',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Data warga berhasil diupdate.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                phoneNumber: '081234567890',
                fullName: 'Siti Aminah (Updated)',
                email: 'siti.new@gmail.com',
                updatedAt: '2024-01-02T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Warga tidak ditemukan.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Hapus data warga',
        description: 'Menghapus data warga secara soft delete.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID warga yang akan dihapus',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Data warga berhasil dihapus.',
        schema: {
            example: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                fullName: 'Siti Aminah',
                deletedAt: '2024-01-02T11:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Warga tidak ditemukan.' })
    remove(@Param('id') id: string) {
        return this.userService.remove(id);
    }
}
