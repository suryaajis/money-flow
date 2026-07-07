import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('recurring')
@UseGuards(JwtAuthGuard)
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.recurringService.findAll(req.user.id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.recurringService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.recurringService.remove(req.user.id, id);
  }
}
