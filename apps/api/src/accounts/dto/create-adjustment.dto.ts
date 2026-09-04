import { IsNumber, IsString, MinLength } from 'class-validator';

export class CreateAdjustmentDto {
  @IsNumber()
  amount: number;

  @IsString()
  @MinLength(3)
  reason: string;
}
