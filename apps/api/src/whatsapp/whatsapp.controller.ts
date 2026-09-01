import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { WhatsappService } from './whatsapp.service';
import { WaNotifierService } from './wa-notifier.service';
import { WaWebhookEvent } from './wa-webhook-event.entity';
import type { WaInboundMessage, WaWebhookBody } from './wa-meta.types';

@Controller('webhook/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly appSecret: string;
  private readonly rateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly whatsappService: WhatsappService,
    private readonly notifier: WaNotifierService,
    @InjectRepository(WaWebhookEvent)
    private readonly eventRepo: Repository<WaWebhookEvent>,
  ) {
    this.appSecret = this.config.get<string>('WA_APP_SECRET', '').trim();
    const hasAccessToken = !!this.config.get<string>('WA_ACCESS_TOKEN');
    const hasPhoneNumberId = !!this.config.get<string>('WA_PHONE_NUMBER_ID');
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction && hasAccessToken !== hasPhoneNumberId) {
      throw new Error(
        'WA_ACCESS_TOKEN dan WA_PHONE_NUMBER_ID harus dikonfigurasi bersama',
      );
    }
    if (isProduction && hasAccessToken && hasPhoneNumberId) {
      if (!this.appSecret)
        throw new Error(
          'WA_APP_SECRET wajib diisi saat WhatsApp aktif di production',
        );
      if (!this.config.get<string>('WA_VERIFY_TOKEN')) {
        throw new Error(
          'WA_VERIFY_TOKEN wajib diisi saat WhatsApp aktif di production',
        );
      }
      if (!this.config.get<string>('WA_BUSINESS_PHONE_NUMBER')) {
        throw new Error(
          'WA_BUSINESS_PHONE_NUMBER wajib diisi saat WhatsApp aktif di production',
        );
      }
    }
  }

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get<string>(
      'WA_VERIFY_TOKEN',
      'money-flow-verify',
    );
    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: WaWebhookBody,
  ) {
    this.verifyPostSignature(req);

    if (
      !this.consumeRate(
        `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`,
        120,
      )
    ) {
      this.logger.warn('WhatsApp webhook IP rate limit reached');
      return { status: 'rate_limited' };
    }

    const changes = (body.entry ?? []).flatMap((entry) => entry.changes ?? []);
    for (const change of changes) {
      const value = change?.value;
      for (const status of value?.statuses ?? []) {
        await this.notifier.updateDeliveryStatus(status);
      }
      for (const message of value?.messages ?? []) {
        await this.processInboundMessage(message);
      }
    }

    return { status: 'ok' };
  }

  private verifyPostSignature(req: RawBodyRequest<Request>): void {
    // Local development can run without Meta credentials. Once WA_APP_SECRET
    // is configured, every webhook POST must have a valid Meta signature.
    if (!this.appSecret) return;

    const header = req.headers['x-hub-signature-256'];
    const signature = Array.isArray(header) ? header[0] : header;
    if (!signature?.startsWith('sha256=') || !req.rawBody) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    const expected = createHmac('sha256', this.appSecret)
      .update(req.rawBody)
      .digest('hex');
    const supplied = signature.slice('sha256='.length);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const suppliedBuffer = Buffer.from(supplied, 'hex');
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }
  }

  private async processInboundMessage(
    message: WaInboundMessage,
  ): Promise<void> {
    const messageId = typeof message.id === 'string' ? message.id : null;
    const from = typeof message.from === 'string' ? message.from : null;
    if (!messageId || !from) {
      this.logger.warn('Ignoring WhatsApp webhook message without id/from');
      return;
    }
    if (!this.consumeRate(`phone:${from}`, 30)) {
      await this.notifier.sendText(
        from,
        'Terlalu banyak pesan dalam satu menit. Tunggu sebentar lalu coba lagi.',
      );
      return;
    }
    const ownerUserId = await this.whatsappService.getActivePhoneOwnerId(from);
    if (ownerUserId && !this.consumeRate(`user:${ownerUserId}`, 60)) {
      await this.notifier.sendText(
        from,
        'Batas pesan gabungan akun tercapai. Tunggu sebentar lalu coba lagi.',
      );
      return;
    }

    const eventKey = `message:${messageId}`;
    try {
      await this.eventRepo.insert(
        this.eventRepo.create({
          eventKey,
          eventType: message.type ?? 'unknown',
          status: 'processing',
          lastError: null,
        }),
      );
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) return;
      throw error;
    }
    try {
      if (message.type === 'text') {
        await this.whatsappService.handleTextMessage(
          from,
          message.text?.body ?? '',
        );
      } else if (message.type === 'audio') {
        if (message.audio?.id) {
          await this.whatsappService.handleAudioMessage(from, message.audio.id);
        }
      } else if (message.type === 'interactive') {
        const reply = message.interactive?.button_reply;
        if (reply?.id && reply.title)
          await this.whatsappService.handleButtonReply(
            from,
            reply.id,
            reply.title,
          );
      }
      await this.eventRepo.update(eventKey, {
        status: 'processed',
        lastError: null,
      });
    } catch (error) {
      const details =
        error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error';
      await this.eventRepo.update(eventKey, {
        status: 'failed',
        lastError: details,
      });
      // Do not automatically replay a finance command: it may already have
      // committed before a reply failed, which could duplicate a transaction.
      this.logger.error(`WhatsApp message ${messageId} failed: ${details}`);
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const record = error as Record<string, unknown>;
    if (record.code === '23505') return true;
    if (typeof record.driverError !== 'object' || record.driverError === null) {
      return false;
    }
    return (record.driverError as Record<string, unknown>).code === '23505';
  }

  private consumeRate(key: string, limit: number): boolean {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    bucket.count += 1;
    if (this.rateBuckets.size > 10_000) {
      for (const [entryKey, entry] of this.rateBuckets)
        if (entry.resetAt <= now) this.rateBuckets.delete(entryKey);
    }
    return bucket.count <= limit;
  }
}
