import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsNumber()
  @Min(0.01)
  sourceAmount: number;

  @IsNumber()
  @Min(0.01)
  destinationAmount: number;

  @IsNumber()
  @Min(0.00000001)
  exchangeRate: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
