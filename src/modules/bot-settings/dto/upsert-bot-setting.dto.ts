import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertBotSettingDto {
  @ApiProperty({
    description: 'Kunci unik setting bot',
    example: 'GREETING_MSG',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  key: string;

  @ApiProperty({
    description: 'Nilai setting bot',
    example: 'Halo, ada yang bisa dibantu?',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Deskripsi setting',
    example: 'Pesan pembuka default bot',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
