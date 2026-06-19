import { IsString, IsNumber, IsIn, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsString()
  categoryId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
