import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Transaction } from './transaction.entity';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  @Get()
  async findAll(@Request() req: { user: { id: string } }): Promise<string[]> {
    const rows = await this.transactionRepository.find({
      where: { userId: req.user.id },
      select: { tags: true },
    });
    return [...new Set(rows.flatMap((row) => row.tags ?? []))].sort((a, b) =>
      a.localeCompare(b),
    );
  }
}
