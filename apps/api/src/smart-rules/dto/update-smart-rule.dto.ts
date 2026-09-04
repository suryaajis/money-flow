import { PartialType } from '@nestjs/mapped-types';
import { CreateSmartRuleDto } from './create-smart-rule.dto';

export class UpdateSmartRuleDto extends PartialType(CreateSmartRuleDto) {}
