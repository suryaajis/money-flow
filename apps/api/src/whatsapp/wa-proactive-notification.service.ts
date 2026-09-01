import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { WaNotificationDelivery } from './wa-notification-delivery.entity';
import { WaNotifierService } from './wa-notifier.service';
import { WaPhoneLink } from './wa-phone-link.entity';

export interface ProactiveTemplateMessage {
  userId: string;
  to: string;
  waPhoneLinkId?: string;
  kind: string;
  templateName: string;
  bodyParameters: Array<string | number>;
}

@Injectable()
export class WaProactiveNotificationService {
  private readonly logger = new Logger(WaProactiveNotificationService.name);
  private readonly timeZone = 'Asia/Jakarta';

  constructor(
    @InjectRepository(WaNotificationDelivery)
    private readonly deliveryRepo: Repository<WaNotificationDelivery>,
    @InjectRepository(WaPhoneLink)
    private readonly phoneLinkRepo: Repository<WaPhoneLink>,
    private readonly notifier: WaNotifierService,
  ) {}

  async sendOncePerDay(
    message: ProactiveTemplateMessage,
    now = new Date(),
  ): Promise<boolean> {
    if (message.waPhoneLinkId) {
      const activeDestination = await this.phoneLinkRepo.findOne({
        where: {
          id: message.waPhoneLinkId,
          userId: message.userId,
          phone: message.to,
          revokedAt: IsNull(),
        },
      });
      if (!activeDestination) return false;
    }
    const deliveryDate = this.dateInTimeZone(now);
    let delivery: WaNotificationDelivery;
    try {
      delivery = this.deliveryRepo.create({
        userId: message.userId,
        waPhoneLinkId: message.waPhoneLinkId ?? null,
        destinationKey:
          message.waPhoneLinkId ??
          createHash('sha256').update(message.to).digest('hex'),
        deliveryDate,
        kind: message.kind,
        status: 'pending',
        messageId: null,
        errorDetails: null,
      });
      delivery = await this.deliveryRepo.save(delivery);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        this.logger.debug(
          `Skipping ${message.kind} for user ${message.userId}: daily limit reached`,
        );
        return false;
      }
      throw error;
    }

    const deliveryId = delivery.id;
    try {
      const result = await this.notifier.sendTemplate(
        message.to,
        message.templateName,
        message.bodyParameters,
      );
      await this.deliveryRepo.update(deliveryId, {
        status: 'sent',
        messageId: result.messageId,
      });
      return true;
    } catch (error) {
      const details =
        error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error';
      await this.deliveryRepo.update(deliveryId, {
        status: 'failed',
        errorDetails: details,
      });
      throw error;
    }
  }

  private dateInTimeZone(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const record = error as Record<string, unknown>;
    if (record.code === '23505') return true;
    if (typeof record.driverError !== 'object' || record.driverError === null)
      return false;
    return (record.driverError as Record<string, unknown>).code === '23505';
  }
}
