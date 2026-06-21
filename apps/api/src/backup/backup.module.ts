import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Category])],
  providers: [BackupService],
  controllers: [BackupController],
})
export class BackupModule {}
