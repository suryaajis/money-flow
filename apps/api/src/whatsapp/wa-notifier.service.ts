import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WaNotifierService {
  private readonly logger = new Logger(WaNotifierService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.token = config.get<string>('WA_ACCESS_TOKEN', '');
    this.phoneNumberId = config.get<string>('WA_PHONE_NUMBER_ID', '');
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(`[DEV] WA → ${to}: ${text}`);
      return;
    }
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send WA message to ${to}`, err);
    }
  }

  async sendTextWithButtons(
    to: string,
    text: string,
    buttons: { id: string; title: string }[],
  ): Promise<void> {
    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(
        `[DEV] WA buttons → ${to}: ${text} | buttons: ${buttons.map(b => b.title).join(', ')}`,
      );
      return;
    }
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: buttons.map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.substring(0, 20) },
              })),
            },
          },
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send WA buttons to ${to}`, err);
    }
  }
}
