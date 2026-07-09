import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaSession } from './wa-session.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { WaNotifierService } from './wa-notifier.service';
import { MessageParserService } from './message-parser.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSettingsController } from './whatsapp.controller.settings';

@Module({
  imports: [TypeOrmModule.forFeature([WaSession, User, Transaction, Category])],
  providers: [WaNotifierService, MessageParserService, WhatsappService],
  controllers: [WhatsappController, WhatsappSettingsController],
})
export class WhatsappModule {}
