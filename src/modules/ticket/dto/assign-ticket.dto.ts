import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTicketDto {
    @ApiProperty({
        description: 'ID staff petugas yang akan menerima penugasan tiket',
        example: '550e8400-e29b-41d4-a716-446655440002',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    assignedTo: string;

    @ApiProperty({
        description: 'ID staff supervisor yang memberikan penugasan',
        example: '550e8400-e29b-41d4-a716-446655440003',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    assignedBy: string;
}
