import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { RuleExecutionBatch } from './rule-execution-batch.entity';
import { RuleCorrectionEvent } from './rule-correction-event.entity';
import { SmartRule } from './smart-rule.entity';
import { SmartRulesController } from './smart-rules.controller';
import { SmartRulesService } from './smart-rules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmartRule,
      RuleExecutionBatch,
      RuleCorrectionEvent,
      Transaction,
    ]),
  ],
  controllers: [SmartRulesController],
  providers: [SmartRulesService],
  exports: [SmartRulesService],
})
export class SmartRulesModule {}
