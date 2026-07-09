import { IsIn, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreateDebtDto {
  @IsIn(['owed_to_me', 'i_owe'])
  direction: 'owed_to_me' | 'i_owe';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  counterpartyName: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
