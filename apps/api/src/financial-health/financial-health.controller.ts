import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialHealthService } from './financial-health.service';

class HealthPreferenceDto {
  @IsBoolean()
  enabled: boolean;
}

type AuthRequest = { user: { id: string } };

@Controller('financial-health')
@UseGuards(JwtAuthGuard)
export class FinancialHealthController {
  constructor(private readonly health: FinancialHealthService) {}

  @Get()
  get(@Request() req: AuthRequest, @Query('period') period?: string) {
    return this.health.calculate(req.user.id, period);
  }

  @Put('preference')
  setPreference(@Request() req: AuthRequest, @Body() dto: HealthPreferenceDto) {
    return this.health.setEnabled(req.user.id, dto.enabled);
  }
}
