import { IsIn } from 'class-validator';

export class UpdateAccountShareDto {
  @IsIn(['viewer', 'contributor'])
  role: 'viewer' | 'contributor';
}
