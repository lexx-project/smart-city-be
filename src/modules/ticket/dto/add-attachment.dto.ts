import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddAttachmentDto {
    @ApiProperty({
        description: 'URL file lampiran yang sudah diupload ke storage',
        example: 'https://storage.smartpublicservice.id/files/foto-jalan-rusak.jpg',
    })
    @IsString()
    @IsNotEmpty()
    fileUrl: string;

    @ApiPropertyOptional({
        description: 'MIME type file lampiran',
        example: 'image/jpeg',
        enum: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'video/mp4',
        ],
    })
    @IsString()
    @IsOptional()
    fileType?: string;

    @ApiPropertyOptional({
        description: 'ID warga atau staff yang mengupload lampiran',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsUUID()
    @IsOptional()
    uploadedBy?: string;
}
