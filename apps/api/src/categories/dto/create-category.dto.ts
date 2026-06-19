import { IsString, IsIn, IsOptional, Matches, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color harus format hex (#RRGGBB)' })
  color: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsIn(['income', 'expense', 'both'])
  type: 'income' | 'expense' | 'both';
}
