import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  email: string;

  @IsString()
  password: string;
}
