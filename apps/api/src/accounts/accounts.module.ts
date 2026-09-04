import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { AccountShare } from './account-share.entity';
import { Account } from './account.entity';
import {
  AccountInvitationsController,
  AccountsController,
} from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountShare, User, Transaction]),
    EmailModule,
  ],
  controllers: [AccountsController, AccountInvitationsController],
  providers: [AccountsService],
  exports: [AccountsService, TypeOrmModule],
})
export class AccountsModule {}
