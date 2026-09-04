import { IsIn, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsIn(['cash', 'bank', 'e_wallet', 'credit_card', 'other'])
  type: 'cash' | 'bank' | 'e_wallet' | 'credit_card' | 'other';

  @IsString()
  @IsIn(['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP'])
  currency: string;

  @IsNumber()
  openingBalance: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
