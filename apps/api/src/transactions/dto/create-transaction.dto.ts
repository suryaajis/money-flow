import {
  IsArray,
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
  IsDateString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsUUID()
  categoryId: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP'])
  currency?: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'JPY' | 'GBP';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  clientMutationId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
