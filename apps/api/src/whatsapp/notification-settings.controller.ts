import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import type { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: { id: string } };

interface NotificationPrefs {
  notifyMonthlyRecap: boolean;
  notifyOverBudget: boolean;
  notifyDebtDue: boolean;
  notifyDailyInput: boolean;
  dailyInputTime: string;
}

@Controller('users/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationSettingsController {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  @Get()
  async get(@Request() req: AuthenticatedRequest): Promise<NotificationPrefs> {
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    return {
      notifyMonthlyRecap: user?.notifyMonthlyRecap ?? false,
      notifyOverBudget: user?.notifyOverBudget ?? false,
      notifyDebtDue: user?.notifyDebtDue ?? false,
      notifyDailyInput: user?.notifyDailyInput ?? false,
      dailyInputTime: user?.dailyInputTime ?? '20:00',
    };
  }

  @Put()
  async update(
    @Request() req: AuthenticatedRequest,
    @Body() body: Partial<NotificationPrefs>,
  ): Promise<NotificationPrefs> {
    const patch: Partial<NotificationPrefs> = {};
    if (typeof body.notifyMonthlyRecap === 'boolean')
      patch.notifyMonthlyRecap = body.notifyMonthlyRecap;
    if (typeof body.notifyOverBudget === 'boolean')
      patch.notifyOverBudget = body.notifyOverBudget;
    if (typeof body.notifyDebtDue === 'boolean')
      patch.notifyDebtDue = body.notifyDebtDue;
    if (typeof body.notifyDailyInput === 'boolean')
      patch.notifyDailyInput = body.notifyDailyInput;
    if (
      typeof body.dailyInputTime === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(body.dailyInputTime)
    )
      patch.dailyInputTime = body.dailyInputTime;
    await this.userRepo.update(req.user.id, patch);
    return this.get(req);
  }
}
