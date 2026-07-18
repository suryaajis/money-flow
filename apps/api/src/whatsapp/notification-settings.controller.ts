import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

interface NotificationPrefs {
  notifyMonthlyRecap: boolean;
  notifyOverBudget: boolean;
  notifyDebtDue: boolean;
}

@Controller('users/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationSettingsController {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  @Get()
  async get(@Request() req: any): Promise<NotificationPrefs> {
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    return {
      notifyMonthlyRecap: user?.notifyMonthlyRecap ?? false,
      notifyOverBudget: user?.notifyOverBudget ?? false,
      notifyDebtDue: user?.notifyDebtDue ?? false,
    };
  }

  @Put()
  async update(
    @Request() req: any,
    @Body() body: Partial<NotificationPrefs>,
  ): Promise<NotificationPrefs> {
    const patch: Partial<NotificationPrefs> = {};
    if (typeof body.notifyMonthlyRecap === 'boolean') patch.notifyMonthlyRecap = body.notifyMonthlyRecap;
    if (typeof body.notifyOverBudget === 'boolean') patch.notifyOverBudget = body.notifyOverBudget;
    if (typeof body.notifyDebtDue === 'boolean') patch.notifyDebtDue = body.notifyDebtDue;
    await this.userRepo.update(req.user.id, patch);
    return this.get(req);
  }
}
