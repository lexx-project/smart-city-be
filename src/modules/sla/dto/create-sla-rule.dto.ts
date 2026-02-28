import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateSlaRuleDto {
    @ApiProperty({
        description: 'ID kategori yang dikenai aturan SLA ini',
        example: '550e8400-e29b-41d4-a716-446655440000',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({
        description: 'Batas maksimal waktu penyelesaian tiket (dalam jam)',
        example: 72,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    maxHours: number;

    @ApiProperty({
        description:
            'Ambang waktu eskalasi tingkat 1 — jika tiket belum ditangani dalam N jam akan memicu notifikasi eskalasi pertama',
        example: 24,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    escalationLevel1Hours: number;

    @ApiProperty({
        description:
            'Ambang waktu eskalasi tingkat 2 — eskalasi ke atasan jika tiket masih belum selesai dalam N jam',
        example: 48,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    escalationLevel2Hours: number;

    @ApiProperty({
        description: 'ID role yang menerima notifikasi eskalasi',
        example: '550e8400-e29b-41d4-a716-446655440001',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    escalationRoleId: string;
}
