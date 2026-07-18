import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletMember } from './wallet-member.entity';
import { User } from '../users/user.entity';
import { SharedWalletService } from './shared-wallet.service';
import { SharedWalletController } from './shared-wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WalletMember, User])],
  providers: [SharedWalletService],
  controllers: [SharedWalletController],
})
export class SharedWalletModule {}
