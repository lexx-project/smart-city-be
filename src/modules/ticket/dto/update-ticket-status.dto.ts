import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TicketStatusEnum {
    OPEN = 'OPEN',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
    ESCALATED = 'ESCALATED',
}

export class UpdateTicketStatusDto {
    @ApiProperty({
        description: 'Status baru tiket',
        enum: TicketStatusEnum,
        example: TicketStatusEnum.IN_PROGRESS,
    })
    @IsEnum(TicketStatusEnum)
    @IsNotEmpty()
    status: TicketStatusEnum;

    @ApiPropertyOptional({
        description: 'Catatan atau alasan perubahan status',
        example: 'Laporan sedang dalam proses pengecekan lapangan oleh petugas.',
    })
    @IsString()
    @IsOptional()
    note?: string;
}
