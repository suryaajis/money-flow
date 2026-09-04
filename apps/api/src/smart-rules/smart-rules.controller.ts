import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSmartRuleDto } from './dto/create-smart-rule.dto';
import { UpdateSmartRuleDto } from './dto/update-smart-rule.dto';
import { SmartRulesService } from './smart-rules.service';

type AuthRequest = { user: { id: string } };

@Controller('smart-rules')
@UseGuards(JwtAuthGuard)
export class SmartRulesController {
  constructor(private readonly rules: SmartRulesService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.rules.findAll(req.user.id);
  }

  @Get('suggestions')
  suggestions(@Request() req: AuthRequest) {
    return this.rules.suggestions(req.user.id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateSmartRuleDto) {
    return this.rules.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSmartRuleDto,
  ) {
    return this.rules.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.rules.remove(req.user.id, id);
  }

  @Post(':id/preview')
  preview(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.rules.preview(req.user.id, id);
  }

  @Post(':id/apply')
  apply(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.rules.applyHistorical(req.user.id, id);
  }

  @Post('batches/:id/undo')
  undo(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.rules.undo(req.user.id, id);
  }
}
