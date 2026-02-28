import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/infra/decorators/public.decorator';
import { AddBotAdminDto } from './dto/add-bot-admin.dto';
import { UpsertBotSettingDto } from './dto/upsert-bot-setting.dto';
import { BotSettingsService } from './bot-settings.service';

@ApiTags('Bot Settings')
@ApiBearerAuth('jwt-auth')
@Controller()
export class BotSettingsController {
  constructor(private readonly botSettingsService: BotSettingsService) {}

  @Public()
  @Get('bot-settings')
  @ApiOperation({
    summary: 'Ambil semua bot settings (public)',
    description:
      'Endpoint ini diakses oleh mesin chatbot WhatsApp tanpa JWT, output dalam bentuk key-value object.',
  })
  @ApiResponse({
    status: 200,
    description: 'Berhasil mengambil semua bot settings.',
    schema: {
      example: {
        GREETING_MSG: 'Halo',
        TIMEOUT_SEC: '60',
      },
    },
  })
  getAllSettings() {
    return this.botSettingsService.getAllSettings();
  }

  @Post('bot-settings')
  @ApiOperation({
    summary: 'Create/Update bot setting (protected)',
    description:
      'Jika key sudah ada maka update value, jika belum ada maka create baru.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bot setting berhasil di-upsert.',
  })
  upsertSetting(@Body() dto: UpsertBotSettingDto) {
    return this.botSettingsService.upsertSetting(
      dto.key,
      dto.value,
      dto.description,
    );
  }

  @Public()
  @Get('bot-admins')
  @ApiOperation({
    summary: 'Ambil semua bot admin aktif (public)',
    description:
      'Endpoint ini diakses oleh mesin chatbot WhatsApp tanpa JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Berhasil mengambil bot admin aktif.',
  })
  getAllAdmins() {
    return this.botSettingsService.getAllAdmins();
  }

  @Post('bot-admins')
  @ApiOperation({
    summary: 'Tambah bot admin (protected)',
    description:
      'Menambah admin baru atau mengaktifkan kembali admin lama yang nonaktif.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bot admin berhasil ditambahkan/diaktifkan kembali.',
  })
  addAdmin(@Body() dto: AddBotAdminDto) {
    return this.botSettingsService.addAdmin(dto.phoneNumber, dto.name);
  }

  @Delete('bot-admins/:phoneNumber')
  @ApiOperation({
    summary: 'Nonaktifkan bot admin (protected)',
    description: 'Mengubah status admin menjadi nonaktif berdasarkan nomor HP.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bot admin berhasil dinonaktifkan.',
  })
  removeAdmin(@Param('phoneNumber') phoneNumber: string) {
    return this.botSettingsService.removeAdmin(phoneNumber);
  }
}
