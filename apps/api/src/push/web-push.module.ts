import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { WebPushController } from './web-push.controller';
import { WebPushSubscription } from './web-push-subscription.entity';
import { WebPushService } from './web-push.service';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([WebPushSubscription, User, Transaction]),
  ],
  controllers: [WebPushController],
  providers: [WebPushService],
})
export class WebPushModule {}
