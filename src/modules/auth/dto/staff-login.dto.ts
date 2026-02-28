import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class StaffLoginDto {
    @ApiProperty({
        description: 'Alamat email staff yang terdaftar',
        example: 'admin@dinas.go.id',
        format: 'email',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Password akun staff (minimal 8 karakter)',
        example: 'P@ssword123',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
