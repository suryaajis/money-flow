import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaOutboundMessage } from './wa-outbound-message.entity';
import type { WaDeliveryStatus } from './wa-meta.types';

export interface WaSendResult {
  messageId: string | null;
  accepted: boolean;
  devMode: boolean;
}

interface SendMetadata {
  messageType: 'text' | 'interactive' | 'template';
  templateName?: string;
}

export class WaApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly metaCode?: number,
  ) {
    super(message);
    this.name = 'WaApiError';
  }
}

@Injectable()
export class WaNotifierService {
  private readonly logger = new Logger(WaNotifierService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private config: ConfigService,
    @InjectRepository(WaOutboundMessage)
    private readonly outboundRepo: Repository<WaOutboundMessage>,
  ) {
    this.token = config.get<string>('WA_ACCESS_TOKEN', '').trim();
    this.phoneNumberId = config.get<string>('WA_PHONE_NUMBER_ID', '').trim();
    const configuredVersion = config
      .get<string>('WA_GRAPH_API_VERSION', 'v25.0')
      .trim();
    const apiVersion = /^v\d+\.\d+$/.test(configuredVersion)
      ? configuredVersion
      : 'v25.0';
    this.apiUrl = `https://graph.facebook.com/${apiVersion}/${this.phoneNumberId}/messages`;
    this.requestTimeoutMs =
      Number(config.get<string>('WA_REQUEST_TIMEOUT_MS', '10000')) || 10_000;
  }

  async sendText(to: string, message: string): Promise<WaSendResult> {
    return this.sendPayload(
      to,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message.slice(0, 4096) },
      },
      { messageType: 'text' },
    );
  }

  async sendTextWithButtons(
    to: string,
    message: string,
    buttons: { id: string; title: string }[],
  ): Promise<WaSendResult> {
    return this.sendPayload(
      to,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message.slice(0, 1024) },
          action: {
            buttons: buttons.slice(0, 3).map((button) => ({
              type: 'reply',
              reply: {
                id: button.id.slice(0, 256),
                title: button.title.substring(0, 20),
              },
            })),
          },
        },
      },
      { messageType: 'interactive' },
    );
  }

  async sendTemplate(
    to: string,
    templateName: string,
    bodyParameters: Array<string | number>,
    languageCode = this.config.get<string>('WA_TEMPLATE_LANGUAGE', 'id'),
  ): Promise<WaSendResult> {
    if (!/^[a-z0-9_]+$/.test(templateName)) {
      throw new WaApiError(
        `Nama template WhatsApp tidak valid: ${templateName}`,
      );
    }

    const components = bodyParameters.length
      ? [
          {
            type: 'body',
            parameters: bodyParameters.map((value) => ({
              type: 'text',
              text: String(value).slice(0, 1024),
            })),
          },
        ]
      : undefined;

    return this.sendPayload(
      to,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
      },
      { messageType: 'template', templateName },
    );
  }

  async updateDeliveryStatus(status: WaDeliveryStatus): Promise<void> {
    const messageId = typeof status.id === 'string' ? status.id : null;
    if (!messageId) return;

    const deliveryStatus =
      typeof status.status === 'string' ? status.status : 'unknown';
    const firstError = Array.isArray(status.errors)
      ? status.errors[0]
      : undefined;
    const errorCode = firstError?.code == null ? null : String(firstError.code);
    const errorDetails = this.truncate(
      firstError?.error_data?.details ??
        firstError?.message ??
        firstError?.title ??
        null,
      2000,
    );

    const update = await this.outboundRepo.update(messageId, {
      status: deliveryStatus,
      errorCode,
      errorDetails,
    });

    if (!update.affected) {
      try {
        await this.outboundRepo.insert(
          this.outboundRepo.create({
            id: messageId,
            recipient: String(status.recipient_id ?? 'unknown').slice(0, 20),
            messageType: 'unknown',
            templateName: null,
            status: deliveryStatus,
            errorCode,
            errorDetails,
          }),
        );
      } catch (error: unknown) {
        if (this.isUniqueViolation(error)) {
          await this.outboundRepo.update(messageId, {
            status: deliveryStatus,
            errorCode,
            errorDetails,
          });
        } else {
          throw error;
        }
      }
    }

    if (deliveryStatus === 'failed') {
      this.logger.error(
        `WhatsApp delivery failed for message ${messageId}: ${errorCode ?? 'unknown'} ${errorDetails ?? ''}`,
      );
    }
  }

  private async sendPayload(
    to: string,
    payload: Record<string, unknown>,
    metadata: SendMetadata,
  ): Promise<WaSendResult> {
    if (!/^\d{8,15}$/.test(to)) {
      throw new WaApiError(
        `Nomor tujuan WhatsApp tidak valid: ${this.maskPhone(to)}`,
      );
    }
    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(
        `[DEV] WhatsApp ${metadata.messageType} message queued for ${this.maskPhone(to)}`,
      );
      return { messageId: null, accepted: false, devMode: true };
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const rawBody = await response.text();
        const responseBody = this.parseJson(rawBody);

        if (!response.ok) {
          const apiError = this.toApiError(
            response.status,
            responseBody,
            rawBody,
          );
          if (
            attempt < maxAttempts &&
            (response.status === 429 || response.status >= 500)
          ) {
            lastError = apiError;
            await this.delay(attempt * 500);
            continue;
          }
          throw apiError;
        }

        const messageId = this.extractMessageId(responseBody);
        if (!messageId) {
          throw new WaApiError(
            'Meta menerima request tetapi tidak mengembalikan message ID',
            response.status,
          );
        }

        await this.recordAcceptedMessage(messageId, to, metadata);
        return { messageId, accepted: true, devMode: false };
      } catch (error) {
        lastError = error;
        const retryableNetworkError = !(error instanceof WaApiError);
        if (attempt < maxAttempts && retryableNetworkError) {
          await this.delay(attempt * 500);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new WaApiError('Pengiriman WhatsApp gagal');
  }

  private maskPhone(phone: string): string {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length <= 6) return '***';
    return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
  }

  private async recordAcceptedMessage(
    messageId: string,
    recipient: string,
    metadata: SendMetadata,
  ): Promise<void> {
    try {
      await this.outboundRepo.insert(
        this.outboundRepo.create({
          id: messageId,
          recipient,
          messageType: metadata.messageType,
          templateName: metadata.templateName ?? null,
          status: 'accepted',
          errorCode: null,
          errorDetails: null,
        }),
      );
    } catch (error) {
      // Meta already accepted the message. A local audit failure must not cause
      // callers to retry and accidentally deliver a duplicate notification.
      if (!this.isUniqueViolation(error)) {
        this.logger.error(
          `Failed to persist WhatsApp message ${messageId}`,
          error as Error,
        );
      }
    }
  }

  private toApiError(
    status: number,
    body: unknown,
    rawBody: string,
  ): WaApiError {
    const root = this.isRecord(body) ? body : {};
    const metaError = this.isRecord(root.error) ? root.error : {};
    const errorData = this.isRecord(metaError.error_data)
      ? metaError.error_data
      : {};
    const code =
      typeof metaError.code === 'number' ? metaError.code : undefined;
    const details =
      (typeof errorData.details === 'string' && errorData.details) ||
      (typeof metaError.message === 'string' && metaError.message) ||
      rawBody ||
      'Unknown Meta API error';
    const safeDetails = this.truncate(details, 2000);
    return new WaApiError(
      `Meta WhatsApp API ${status}${code ? ` (#${code})` : ''}: ${safeDetails}`,
      status,
      code,
    );
  }

  private parseJson(value: string): unknown {
    try {
      return value ? (JSON.parse(value) as unknown) : {};
    } catch {
      return {};
    }
  }

  private truncate(value: unknown, max: number): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value.slice(0, max);
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).slice(0, max);
    }
    try {
      return JSON.stringify(value).slice(0, max);
    } catch {
      return 'Unserializable error';
    }
  }

  private extractMessageId(value: unknown): string | null {
    if (!this.isRecord(value) || !Array.isArray(value.messages)) return null;
    const messages: unknown[] = value.messages;
    const first = messages[0];
    return this.isRecord(first) && typeof first.id === 'string'
      ? first.id
      : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!this.isRecord(error)) return false;
    if (error.code === '23505') return true;
    return (
      this.isRecord(error.driverError) && error.driverError.code === '23505'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
