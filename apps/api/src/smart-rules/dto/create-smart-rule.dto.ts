import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import type { RuleActions, RuleConditions } from '../smart-rule.entity';

export class CreateSmartRuleDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsObject()
  conditions: RuleConditions;

  @IsObject()
  actions: RuleActions;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnMatch?: boolean;
}
