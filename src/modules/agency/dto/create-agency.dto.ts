import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateAgencyDto {
    @ApiProperty({
        description: 'Nama dinas / instansi pemerintah',
        example: 'Dinas Perhubungan Kota Bandung',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Deskripsi singkat tentang dinas',
        example: 'Dinas yang bertanggung jawab atas pengelolaan transportasi kota',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'Email kontak resmi dinas',
        example: 'info@dishub.bandung.go.id',
        required: false,
        format: 'email',
    })
    @IsEmail()
    @IsOptional()
    contactEmail?: string;

    @ApiProperty({
        description: 'Nomor telepon kontak dinas',
        example: '022-12345678',
        required: false,
    })
    @IsString()
    @IsOptional()
    contactPhone?: string;

    @ApiProperty({
        description: 'Status aktif dinas. Default: true',
        example: true,
        required: false,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
