import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'Password baru staff (minimal 8 karakter)',
        example: 'NewP@ssword123',
        minLength: 8,
        writeOnly: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    newPassword: string;
}
