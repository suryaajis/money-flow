import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  getAll(@Request() req: any, @Query('status') status?: string) {
    if (status === 'settled') return this.debtsService.findSettled(req.user.id);
    if (status === 'active') return this.debtsService.findActive(req.user.id);
    return this.debtsService.findAll(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateDebtDto>) {
    return this.debtsService.update(req.user.id, id, dto);
  }

  @Patch(':id/settle')
  settle(@Request() req: any, @Param('id') id: string) {
    return this.debtsService.settle(req.user.id, id);
  }

  @Patch(':id/unsettle')
  unsettle(@Request() req: any, @Param('id') id: string) {
    return this.debtsService.unsettle(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.debtsService.remove(req.user.id, id);
  }
}
