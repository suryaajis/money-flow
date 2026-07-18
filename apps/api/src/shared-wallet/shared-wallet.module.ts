import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletMember } from './wallet-member.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SharedWalletService } from './shared-wallet.service';
import { SharedWalletController } from './shared-wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletMember, User, Transaction, Category]),
    WhatsappModule, // provides WaNotifierService for owner activity notifications
  ],
  providers: [SharedWalletService],
  controllers: [SharedWalletController],
})
export class SharedWalletModule {}
