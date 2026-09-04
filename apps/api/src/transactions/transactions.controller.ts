import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.transactionsService.findAll(req.user.id, {
      type,
      categoryId,
      startDate,
      endDate,
      accountId,
    });
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(req.user.id, id, dto);
  }

  @Delete('bulk')
  @HttpCode(204)
  bulkDelete(@Request() req: AuthRequest, @Body() body: { ids: string[] }) {
    return this.transactionsService.bulkRemove(req.user.id, body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.transactionsService.remove(req.user.id, id);
  }
}
