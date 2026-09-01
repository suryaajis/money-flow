import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { WebPushSubscription } from './web-push-subscription.entity';

export interface BrowserSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly configured: boolean;

  constructor(
    @InjectRepository(WebPushSubscription)
    private readonly subscriptions: Repository<WebPushSubscription>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    config: ConfigService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY', '');
    const subject = config.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@moneyflow.app',
    );
    this.configured = !!publicKey && !!privateKey;
    if (this.configured)
      webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async subscribe(userId: string, input: BrowserSubscriptionInput) {
    let row = await this.subscriptions.findOne({
      where: { userId, endpoint: input.endpoint },
    });
    row ??= this.subscriptions.create({ userId, endpoint: input.endpoint });
    row.p256dh = input.keys.p256dh;
    row.auth = input.keys.auth;
    return this.subscriptions.save(row);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subscriptions.delete({ userId, endpoint });
  }

  @Cron('0 * * * * *', { timeZone: 'Asia/Jakarta' })
  async sendDailyReminders(now = new Date()): Promise<void> {
    if (!this.configured) return;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const time = `${part('hour')}:${part('minute')}`;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      part('weekday'),
    );
    const users = await this.users.find({
      where: { webPushReminderEnabled: true },
    });

    for (const user of users) {
      if (
        user.webPushReminderTime !== time ||
        !user.webPushReminderDays.includes(String(weekday))
      )
        continue;
      if (
        await this.transactions.exists({
          where: { userId: user.id, date: today },
        })
      )
        continue;
      const targets = await this.subscriptions.find({
        where: { userId: user.id },
      });
      for (const target of targets.filter(
        (item) => item.lastNotifiedOn !== today,
      )) {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            JSON.stringify({
              title: 'Money Flow Reminder',
              body: 'Belum ada transaksi hari ini. Yuk catat selagi masih ingat.',
              url: '/transactions?add=1',
              tag: `daily-reminder-${today}`,
            }),
          );
          await this.subscriptions.update(target.id, { lastNotifiedOn: today });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410)
            await this.subscriptions.delete(target.id);
          else
            this.logger.error(
              `Web Push failed for subscription ${target.id}`,
              error as Error,
            );
        }
      }
    }
  }
}
