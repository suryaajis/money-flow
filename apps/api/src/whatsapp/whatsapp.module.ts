import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WaSession } from './wa-session.entity';
import { WaLinkChallenge } from './wa-link-challenge.entity';
import { WaWebhookEvent } from './wa-webhook-event.entity';
import { WaOutboundMessage } from './wa-outbound-message.entity';
import { WaNotificationDelivery } from './wa-notification-delivery.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { WaNotifierService } from './wa-notifier.service';
import { MessageParserService } from './message-parser.service';
import { TemplateParserService } from './template-parser.service';
import { VoiceService } from './voice.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSettingsController } from './whatsapp.controller.settings';
import { ExportController } from './export.controller';
import { WaProactiveNotificationService } from './wa-proactive-notification.service';
import { WalletMember } from '../shared-wallet/wallet-member.entity';
import { WaPhoneLink } from './wa-phone-link.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransfersModule } from '../transfers/transfers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WaSession,
      WaLinkChallenge,
      WaWebhookEvent,
      WaOutboundMessage,
      WaNotificationDelivery,
      User,
      Transaction,
      Category,
      Budget,
      Debt,
      WalletMember,
      WaPhoneLink,
    ]),
    TransactionsModule,
    AccountsModule,
    TransfersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [
    WhatsappController,
    WhatsappSettingsController,
    ExportController,
  ],
  providers: [
    WhatsappService,
    WaNotifierService,
    WaProactiveNotificationService,
    MessageParserService,
    TemplateParserService,
    VoiceService,
  ],
  exports: [WhatsappService, WaNotifierService, WaProactiveNotificationService],
})
export class WhatsappModule {}
