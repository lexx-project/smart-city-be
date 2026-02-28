import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        description: 'Nomor telepon warga (digunakan sebagai identitas utama)',
        example: '081234567890',
    })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiPropertyOptional({
        description: 'Nama lengkap warga',
        example: 'Siti Aminah',
    })
    @IsString()
    @IsOptional()
    fullName?: string;

    @ApiPropertyOptional({
        description: 'Alamat email warga',
        example: 'siti@gmail.com',
        format: 'email',
    })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({
        description: 'Nomor Induk Kependudukan (NIK) warga',
        example: '3271234567890001',
        minLength: 16,
        maxLength: 16,
    })
    @IsString()
    @IsOptional()
    nik?: string;

    @ApiPropertyOptional({
        description: 'Status verifikasi akun warga. Default: false',
        example: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;
}
