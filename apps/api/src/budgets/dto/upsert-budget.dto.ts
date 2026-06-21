import { IsString, IsNumber, IsPositive, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertBudgetDto {
  @IsString()
  categoryId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  month: string;
}
