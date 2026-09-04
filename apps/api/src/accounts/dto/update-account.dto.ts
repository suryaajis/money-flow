import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['openingBalance'] as const),
) {}
