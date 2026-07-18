import {
  Controller,
  Get,
  Query,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import type { Response } from 'express';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';

/**
 * Public, token-gated CSV export used by the WhatsApp `ekspor` command (CMD-09).
 * The link carries a short-lived (1h) JWT signed with JWT_SECRET, so no session
 * cookie is required — the user just taps the link from WhatsApp.
 */
@Controller('export')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {}

  @Get('transactions')
  async exportTransactions(@Query('token') token: string, @Res() res: Response) {
    let userId: string;
    try {
      const payload = this.jwt.verify(token);
      if (payload?.purpose !== 'wa-export' || !payload?.sub) {
        throw new Error('invalid purpose');
      }
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Link ekspor tidak valid atau sudah kedaluwarsa.');
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const txs = await this.txRepo.find({
      where: { userId, date: Between(start, end) },
      order: { date: 'ASC' },
    });
    const cats = await this.catRepo.find({ where: { userId } });
    const catName = (id: string) => cats.find(c => c.id === id)?.name ?? '';

    const rows = [
      ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan', 'Sumber'],
      ...txs.map(t => [
        t.date,
        t.type,
        catName(t.categoryId),
        String(Number(t.amount)),
        t.notes ?? '',
        (t as any).source ?? 'web',
      ]),
    ];
    const csv = rows.map(r => r.map(cell => this.csvCell(cell)).join(',')).join('\r\n');

    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="moneyflow-${month}.csv"`);
    // BOM so Excel opens UTF-8 correctly.
    res.send('﻿' + csv);
  }

  private csvCell(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
