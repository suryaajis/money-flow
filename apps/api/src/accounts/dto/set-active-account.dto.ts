import { IsUUID } from 'class-validator';

export class SetActiveAccountDto {
  @IsUUID()
  accountId: string;
}
