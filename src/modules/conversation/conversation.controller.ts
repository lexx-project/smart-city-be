import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConversationService } from './conversation.service';

@ApiTags('Conversation')
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) { }

  @Get('webhook')
  @ApiOperation({
    summary: 'Verifikasi webhook (GET challenge)',
    description:
      'Endpoint verifikasi yang dipanggil oleh platform pesan eksternal (contoh: WhatsApp Business API / Meta) ' +
      'saat mendaftarkan webhook. Mengembalikan nilai `hub.challenge` jika token cocok.',
  })
  @ApiQuery({
    name: 'hub.mode',
    required: true,
    description: 'Mode yang dikirim oleh platform (biasanya "subscribe")',
    example: 'subscribe',
  })
  @ApiQuery({
    name: 'hub.verify_token',
    required: true,
    description: 'Token rahasia yang dicocokkan dengan konfigurasi server',
    example: 'my_secret_verify_token',
  })
  @ApiQuery({
    name: 'hub.challenge',
    required: true,
    description: 'Nilai acak yang harus dikembalikan jika verifikasi berhasil',
    example: '1158201444',
  })
  @ApiResponse({
    status: 200,
    description: 'Token valid. Mengembalikan nilai hub.challenge (angka).',
    schema: { example: 1158201444 },
  })
  @ApiResponse({ status: 403, description: 'Token tidak cocok. Verifikasi ditolak.' })
  handleVerification(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.conversationService.verifyWebhook(mode, token, challenge);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Terima pesan masuk (POST webhook)',
    description:
      'Endpoint penerima event/pesan dari platform pesan eksternal. ' +
      'Setiap pesan yang masuk akan diproses dan dikonversi menjadi tiket atau balasan percakapan. ' +
      '**Catatan:** Endpoint ini biasanya dipanggil oleh platform eksternal, bukan oleh klien CMS.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook berhasil diproses.',
    schema: { example: { status: 'ok' } },
  })
  @ApiResponse({ status: 400, description: 'Format payload webhook tidak dikenali.' })
  handleWebhook(@Body() payload: any) {
    return this.conversationService.processIncoming(payload);
  }
}
