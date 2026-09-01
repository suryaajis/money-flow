import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { WhatsappModule } from './whatsapp.module';
import { WaNotificationsService } from './wa-notifications.service';
import { NotificationSettingsController } from './notification-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, Category, Budget, Debt]),
    WhatsappModule, // provides WaNotifierService
  ],
  controllers: [NotificationSettingsController],
  providers: [WaNotificationsService],
})
export class WaNotificationsModule {}
