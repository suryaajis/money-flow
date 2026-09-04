import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { FinancialHealthController } from './financial-health.controller';
import { FinancialHealthSnapshot } from './financial-health-snapshot.entity';
import { FinancialHealthService } from './financial-health.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialHealthSnapshot,
      Transaction,
      Budget,
      Debt,
      User,
    ]),
  ],
  controllers: [FinancialHealthController],
  providers: [FinancialHealthService],
})
export class FinancialHealthModule {}
