import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { Category } from '../categories/category.entity';
import { TagsController } from './tags.controller';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { AccountsModule } from '../accounts/accounts.module';
import { SmartRulesModule } from '../smart-rules/smart-rules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Category]),
    AccountsModule,
    SmartRulesModule,
  ],
  controllers: [TransactionsController, TagsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
