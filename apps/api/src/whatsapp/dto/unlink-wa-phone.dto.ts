import { IsString, MinLength } from 'class-validator';

export class UnlinkWaPhoneDto {
  @IsString()
  @MinLength(1, { message: 'Password wajib diisi' })
  password: string;
}
