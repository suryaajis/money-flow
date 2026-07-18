import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debt } from './debt.entity';
import { DebtsService } from './debts.service';
import { DebtsController } from './debts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Debt])],
  providers: [DebtsService],
  controllers: [DebtsController],
})
export class DebtsModule {}
