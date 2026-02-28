import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);

    private readonly apiUrl: string;
    private readonly phoneNumberId: string;
    private readonly accessToken: string;

    constructor(private readonly configService: ConfigService) {
        this.phoneNumberId = this.configService.get<string>('WA_PHONE_NUMBER_ID', '');
        this.accessToken = this.configService.get<string>('WA_ACCESS_TOKEN', '');
        this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
    }

    /**
     * Sends a plain text message to a WhatsApp number.
     */
    async sendTextMessage(to: string, body: string): Promise<SendMessageResult> {
        if (!this.phoneNumberId || !this.accessToken) {
            this.logger.warn('[WhatsApp] Credentials not configured. Skipping actual send.');
            return { success: false, error: 'WA credentials not set.' };
        }

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { preview_url: false, body },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const messageId = response.data?.messages?.[0]?.id;
            this.logger.log(`[WhatsApp] Message sent to ${to}. ID: ${messageId}`);
            return { success: true, messageId };
        } catch (error: any) {
            const errMsg = error?.response?.data?.error?.message || error.message;
            this.logger.error(`[WhatsApp] Failed to send message to ${to}: ${errMsg}`);
            return { success: false, error: errMsg };
        }
    }

    /**
     * Marks a message as read.
     */
    async markAsRead(messageId: string): Promise<void> {
        if (!this.phoneNumberId || !this.accessToken) return;

        try {
            await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
        } catch (error: any) {
            this.logger.warn(`[WhatsApp] Failed to mark message as read: ${error.message}`);
        }
    }
}
