import { IsEmail, IsIn } from 'class-validator';

export class InviteAccountDto {
  @IsEmail()
  email: string;

  @IsIn(['viewer', 'contributor'])
  role: 'viewer' | 'contributor';
}
