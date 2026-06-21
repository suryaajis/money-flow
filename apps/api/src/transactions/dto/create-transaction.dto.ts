import { IsArray, IsString, IsNumber, IsIn, IsOptional, IsDateString, Min, Length } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
