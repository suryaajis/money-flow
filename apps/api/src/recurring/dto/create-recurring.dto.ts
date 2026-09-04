import {
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRecurringDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
