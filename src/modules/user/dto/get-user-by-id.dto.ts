import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class GetUserByIdDto {
    @ApiProperty({
        description: 'UUID dari warga',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsString()
    @IsUUID()
    readonly id: string;
}