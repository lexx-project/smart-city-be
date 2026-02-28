import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'ID dinas pemilik kategori ini',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    agencyId: string;

    @ApiPropertyOptional({
        description:
            'ID kategori induk. Kosongkan (null) untuk membuat kategori tingkat root.',
        example: '550e8400-e29b-41d4-a716-446655440001',
        format: 'uuid',
        nullable: true,
    })
    @IsUUID()
    @IsOptional()
    parentId?: string;

    @ApiProperty({
        description: 'Nama kategori layanan',
        example: 'Pengaduan Jalan Rusak',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        description: 'Deskripsi kategori',
        example: 'Kategori untuk melaporkan kondisi jalan yang rusak atau berlubang',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        description:
            'Batas waktu default SLA untuk kategori ini (dalam jam). Minimum 1 jam.',
        example: 24,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    defaultSlaHours?: number;

    @ApiPropertyOptional({
        description: 'Urutan tampil kategori (makin kecil makin depan)',
        example: 1,
    })
    @IsInt()
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({
        description: 'Status aktif kategori. Default: true',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description:
            'Konfigurasi integrasi eksternal kategori ini (endpoint, method, authType, requiredFields)',
        example: {
            endpoint: 'https://simpeg.go.id/api/report',
            method: 'POST',
            authType: 'apiKey',
            requiredFields: ['nik', 'description'],
        },
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    integrationConfig?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Metadata tambahan kategori dalam format JSON bebas',
        example: { icon: 'road', color: '#FF5733' },
        type: 'object',
        additionalProperties: true,
    })
    @IsOptional()
    metadata?: Record<string, any>;
}
