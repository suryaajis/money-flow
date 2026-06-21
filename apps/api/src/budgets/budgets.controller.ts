import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

type JwtUser = { id: string };

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  getAll(@Request() req: { user: JwtUser }, @Query('month') month?: string) {
    return this.budgetsService.findByMonth(req.user.id, month);
  }

  @Post()
  upsert(@Request() req: { user: JwtUser }, @Body() dto: UpsertBudgetDto) {
    return this.budgetsService.upsert(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    return this.budgetsService.remove(req.user.id, id);
  }

  @Post('copy-previous')
  copyPrevious(@Request() req: { user: JwtUser }, @Body('month') month: string) {
    return this.budgetsService.copyFromPreviousMonth(req.user.id, month);
  }
}
