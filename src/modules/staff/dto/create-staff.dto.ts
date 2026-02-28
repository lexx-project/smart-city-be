import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';

export class CreateStaffDto {
    @ApiProperty({
        description: 'ID dinas tempat staff bertugas',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    agencyId: string;

    @ApiProperty({
        description: 'ID role / jabatan staff',
        example: '550e8400-e29b-41d4-a716-446655440001',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    roleId: string;

    @ApiProperty({
        description: 'Nama lengkap staff',
        example: 'Budi Santoso',
    })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({
        description: 'Alamat email staff (digunakan untuk login)',
        example: 'budi@dishub.go.id',
        format: 'email',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiPropertyOptional({
        description: 'Nomor telepon staff',
        example: '081234567890',
    })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        description: 'Password akun staff (minimal 8 karakter, akan di-hash)',
        example: 'P@ssword123',
        minLength: 8,
        writeOnly: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({
        description: 'Status aktif akun staff. Default: true',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
