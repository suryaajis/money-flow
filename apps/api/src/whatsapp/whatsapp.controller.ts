import { Controller, Get, Post, Query, Body, HttpCode, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get<string>('WA_VERIFY_TOKEN', 'money-flow-verify');
    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    try {
      const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
      if (!messages?.length) return { status: 'ok' };

      for (const msg of messages) {
        const from = msg.from;
        if (msg.type === 'text') {
          await this.whatsappService.handleTextMessage(from, msg.text.body);
        } else if (msg.type === 'audio') {
          await this.whatsappService.handleAudioMessage(from, msg.audio.id);
        } else if (msg.type === 'interactive') {
          const reply = msg.interactive?.button_reply;
          if (reply) await this.whatsappService.handleButtonReply(from, reply.id, reply.title);
        }
      }
    } catch (err) {
      this.logger.error('Webhook processing error', err);
    }
    return { status: 'ok' };
  }
}
