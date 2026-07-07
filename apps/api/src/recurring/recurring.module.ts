import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringTransaction } from './recurring-transaction.entity';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecurringTransaction])],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
