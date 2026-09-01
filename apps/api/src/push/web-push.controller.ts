import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { WebPushService } from './web-push.service';
import type { BrowserSubscriptionInput } from './web-push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class WebPushController {
  constructor(
    private readonly push: WebPushService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get('settings')
  async settings(@Request() req: { user: { id: string } }) {
    const user = await this.users.findOne({ where: { id: req.user.id } });
    return {
      publicKey: this.config.get<string>('VAPID_PUBLIC_KEY', ''),
      enabled: user?.webPushReminderEnabled ?? false,
      time: user?.webPushReminderTime ?? '20:00',
      days: (
        user?.webPushReminderDays ?? ['0', '1', '2', '3', '4', '5', '6']
      ).map(Number),
    };
  }

  @Put('settings')
  async updateSettings(
    @Request() req: { user: { id: string } },
    @Body() body: { enabled?: boolean; time?: string; days?: number[] },
  ) {
    if (body.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) {
      throw new BadRequestException('Format waktu harus HH:mm');
    }
    if (
      body.days &&
      body.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    ) {
      throw new BadRequestException('Hari reminder tidak valid');
    }
    await this.users.update(req.user.id, {
      ...(typeof body.enabled === 'boolean'
        ? { webPushReminderEnabled: body.enabled }
        : {}),
      ...(body.time ? { webPushReminderTime: body.time } : {}),
      ...(body.days ? { webPushReminderDays: body.days.map(String) } : {}),
    });
    return this.settings(req);
  }

  @Post('subscriptions')
  async subscribe(
    @Request() req: { user: { id: string } },
    @Body() body: BrowserSubscriptionInput,
  ) {
    if (
      !body?.endpoint?.startsWith('https://') ||
      !body.keys?.p256dh ||
      !body.keys?.auth
    ) {
      throw new BadRequestException('Web Push subscription tidak valid');
    }
    return this.push.subscribe(req.user.id, body);
  }

  @Delete('subscriptions')
  async unsubscribe(
    @Request() req: { user: { id: string } },
    @Body() body: { endpoint: string },
  ) {
    await this.push.unsubscribe(req.user.id, body.endpoint);
    return { success: true };
  }
}
