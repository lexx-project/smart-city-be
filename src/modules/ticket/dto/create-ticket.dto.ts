import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PriorityLevel } from '../../../../generated/prisma/enums';

export class CreateTicketDto {
    @ApiProperty({
        description: 'Deskripsi lengkap pengaduan / permohonan layanan',
        example: 'Terdapat lubang besar di Jalan Sudirman No. 45 yang membahayakan pengendara',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'ID warga yang mengajukan tiket',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'ID kategori layanan yang dipilih warga',
        example: '550e8400-e29b-41d4-a716-446655440001',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    categoryId: string;

    @ApiPropertyOptional({
        description: 'Tingkat prioritas tiket',
        enum: PriorityLevel,
        example: PriorityLevel.MEDIUM,
    })
    @IsEnum(PriorityLevel)
    @IsOptional()
    priority?: PriorityLevel;
}
