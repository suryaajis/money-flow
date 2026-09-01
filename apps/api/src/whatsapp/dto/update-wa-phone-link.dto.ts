import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWaPhoneLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  label?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
