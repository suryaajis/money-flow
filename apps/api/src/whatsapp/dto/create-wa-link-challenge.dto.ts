import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWaLinkChallengeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  label?: string;
}
