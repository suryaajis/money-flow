import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WaSession } from './wa-session.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { WaNotifierService } from './wa-notifier.service';
import { MessageParserService } from './message-parser.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WaSession) private sessionRepo: Repository<WaSession>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    private notifier: WaNotifierService,
    private parser: MessageParserService,
  ) {}

  async getLinkStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return { linked: !!user?.waPhone, phone: user?.waPhone ?? null, linkedAt: user?.waLinkedAt ?? null };
  }

  async linkPhone(userId: string, phone: string) {
    const normalized = this.normalizePhone(phone);
    const existing = await this.userRepo.findOne({ where: { waPhone: normalized } });
    if (existing && existing.id !== userId) {
      throw new Error('Nomor WA sudah terhubung ke akun lain');
    }
    await this.userRepo.update(userId, { waPhone: normalized, waLinkedAt: new Date() });
    return { success: true, phone: normalized };
  }

  async unlinkPhone(userId: string) {
    await this.userRepo.update(userId, { waPhone: null, waLinkedAt: null });
  }

  async handleTextMessage(from: string, text: string) {
    const user = await this.userRepo.findOne({ where: { waPhone: from } });
    if (!user) {
      await this.notifier.sendText(from,
        '👋 Halo! Kamu belum menghubungkan nomor WA ini ke akun Money Flow.\n\n' +
        'Buka aplikasi → Settings → WhatsApp untuk menghubungkan.'
      );
      return;
    }

    const session = await this.getOrCreateSession(from);
    const trimmed = text.trim().toLowerCase();

    // Check if awaiting interactive response
    if (session.state !== 'idle') {
      await this.handleSessionState(user, session, text);
      return;
    }

    // Rate limiting: max 60 messages per hour (simple in-memory would need Redis; skip for now)

    // Bot commands
    if (['saldo', 'balance'].includes(trimmed)) {
      await this.handleSaldo(user);
    } else if (['rekap', 'laporan'].includes(trimmed) || trimmed.startsWith('rekap ')) {
      await this.handleRekap(user, trimmed);
    } else if (['hapus', 'batal', 'undo'].includes(trimmed)) {
      await this.handleHapus(user, session);
    } else if (['daftar', 'list'].includes(trimmed)) {
      await this.handleDaftar(user);
    } else if (trimmed === 'budget') {
      await this.handleBudget(user);
    } else if (['bantuan', 'help', '?'].includes(trimmed)) {
      await this.handleBantuan(from);
    } else {
      // Try to parse as transaction
      await this.handleTransactionInput(user, session, text);
    }
  }

  async handleAudioMessage(from: string, audioId: string) {
    const user = await this.userRepo.findOne({ where: { waPhone: from } });
    if (!user) return;
    await this.notifier.sendText(from, '🎙️ Voice note diterima. Fitur ini sedang dikembangkan dan akan segera tersedia!');
  }

  async handleButtonReply(from: string, replyId: string, replyTitle: string) {
    const user = await this.userRepo.findOne({ where: { waPhone: from } });
    if (!user) return;
    const session = await this.getOrCreateSession(from);

    if (session.state === 'awaiting_confirm_delete') {
      const txId = session.context?.txId;
      if (replyId === 'confirm_delete' && txId) {
        await this.txRepo.delete(txId);
        await this.sessionRepo.update(session.id, { state: 'idle', context: null });
        await this.notifier.sendText(from, '✅ Transaksi berhasil dihapus.');
      } else {
        await this.sessionRepo.update(session.id, { state: 'idle', context: null });
        await this.notifier.sendText(from, '❌ Penghapusan dibatalkan.');
      }
    } else if (session.state === 'awaiting_category') {
      const partial = session.context?.partial;
      if (partial && replyId.startsWith('cat_')) {
        const catId = replyId.replace('cat_', '');
        await this.saveTransaction(user, { ...partial, categoryId: catId }, from);
        await this.sessionRepo.update(session.id, { state: 'idle', context: null });
      }
    }
  }

  private async handleTransactionInput(user: User, session: WaSession, text: string) {
    const from = user.waPhone;
    const categories = await this.catRepo.find({ where: { userId: user.id } });
    const parsed = await this.parser.parse(text, categories, new Date());

    if (!parsed || parsed.transactions.length === 0) {
      await this.notifier.sendText(from,
        '❓ Maaf, tidak bisa memahami pesanmu.\n\n' +
        'Coba format: "kopi 15rb" atau "gajian 5jt"\n' +
        'Ketik *bantuan* untuk melihat semua perintah.'
      );
      return;
    }

    let saved = 0;
    for (const tx of parsed.transactions) {
      if (!tx.categoryId) {
        // Need to ask for category
        const options = categories
          .filter(c => c.type === tx.type || c.type === 'both')
          .slice(0, 3)
          .map(c => ({ id: `cat_${c.id}`, title: c.name }));

        await this.sessionRepo.update(session.id, {
          state: 'awaiting_category',
          context: { partial: tx },
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await this.notifier.sendTextWithButtons(
          from,
          `❓ "${tx.notes || text}" — ini untuk kategori apa?`,
          options,
        );
        return;
      }
      await this.saveTransaction(user, tx, from);
      saved++;
    }

    if (saved > 1) {
      await this.notifier.sendText(from, `✅ ${saved} transaksi berhasil dicatat!`);
    }
  }

  private async saveTransaction(user: User, tx: any, from: string) {
    const saved = this.txRepo.create({
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      date: tx.date || new Date().toISOString().split('T')[0],
      notes: tx.notes || undefined,
      userId: user.id,
      source: 'whatsapp',
      recordedBy: user.id,
    });
    await this.txRepo.save(saved);

    const cat = await this.catRepo.findOne({ where: { id: tx.categoryId } });
    const sign = tx.type === 'income' ? '+' : '-';
    const amount = new Intl.NumberFormat('id-ID').format(tx.amount);
    await this.notifier.sendText(from,
      `✅ Tercatat: ${sign}Rp${amount} ${cat?.name ?? ''}${tx.notes ? ' • ' + tx.notes : ''}`
    );
  }

  private async handleSaldo(user: User) {
    const from = user.waPhone;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const txs = await this.txRepo.find({
      where: { userId: user.id, date: Between(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )},
    });

    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const net = income - expense;

    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const month = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    await this.notifier.sendText(from,
      `💰 *Saldo ${month}*\n\n` +
      `📈 Pemasukan: +Rp${fmt(income)}\n` +
      `📉 Pengeluaran: -Rp${fmt(expense)}\n` +
      `💵 Saldo bersih: Rp${fmt(net)}`
    );
  }

  private async handleRekap(user: User, cmd: string) {
    const from = user.waPhone;
    const now = new Date();
    let startDate: Date, endDate: Date, label: string;

    if (cmd.includes('minggu')) {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      label = '7 hari terakhir';
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    }

    const txs = await this.txRepo.find({
      where: { userId: user.id, date: Between(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )},
      relations: ['category'],
    });

    const expense = txs.filter(t => t.type === 'expense');
    const catTotals = new Map<string, number>();
    for (const tx of expense) {
      const name = tx.category?.name ?? 'Lain-lain';
      catTotals.set(name, (catTotals.get(name) ?? 0) + Number(tx.amount));
    }
    const top3 = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

    let msg = `📊 *Rekap ${label}*\n\n`;
    msg += `📉 Total pengeluaran: -Rp${fmt(totalExpense)}\n\n`;
    if (top3.length) {
      msg += `🏆 Top kategori:\n`;
      top3.forEach(([name, total], i) => {
        const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
        msg += `${i + 1}. ${name}: Rp${fmt(total)} (${pct}%)\n`;
      });
    }

    await this.notifier.sendText(from, msg);
  }

  private async handleHapus(user: User, session: WaSession) {
    const from = user.waPhone;
    const last = await this.txRepo.findOne({
      where: { userId: user.id, source: 'whatsapp' },
      order: { createdAt: 'DESC' },
    });

    if (!last) {
      await this.notifier.sendText(from, '❌ Tidak ada transaksi WA terbaru untuk dihapus.');
      return;
    }

    const sign = last.type === 'income' ? '+' : '-';
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

    await this.sessionRepo.update(session.id, {
      state: 'awaiting_confirm_delete',
      context: { txId: last.id },
      expiresAt: new Date(Date.now() + 3 * 60 * 1000),
    });

    await this.notifier.sendTextWithButtons(
      from,
      `Hapus transaksi terakhir?\n${sign}Rp${fmt(Number(last.amount))} • ${last.date}`,
      [
        { id: 'confirm_delete', title: 'Ya, hapus' },
        { id: 'cancel_delete', title: 'Batal' },
      ],
    );
  }

  private async handleDaftar(user: User) {
    const from = user.waPhone;
    const txs = await this.txRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['category'],
    });

    if (!txs.length) {
      await this.notifier.sendText(from, '📋 Belum ada transaksi.');
      return;
    }

    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    let msg = '📋 *5 Transaksi Terakhir*\n\n';
    for (const tx of txs) {
      const sign = tx.type === 'income' ? '+' : '-';
      msg += `${sign}Rp${fmt(Number(tx.amount))} ${tx.category?.name ?? ''} • ${tx.date}\n`;
    }

    await this.notifier.sendText(from, msg);
  }

  private async handleBudget(user: User) {
    const from = user.waPhone;
    await this.notifier.sendText(from,
      '💼 Fitur budget via WA akan segera hadir!\n\nUntuk sekarang, cek budget di dashboard aplikasi.'
    );
  }

  private async handleBantuan(from: string) {
    await this.notifier.sendText(from,
      '📖 *Panduan Money Flow Bot*\n\n' +
      '*Catat transaksi:*\n' +
      '• kopi 15rb\n' +
      '• gajian 8jt\n' +
      '• bensin 50k, parkir 3k\n\n' +
      '*Perintah:*\n' +
      '• *saldo* — Ringkasan bulan ini\n' +
      '• *rekap* — Laporan bulanan\n' +
      '• *rekap minggu ini* — Laporan 7 hari\n' +
      '• *daftar* — 5 transaksi terakhir\n' +
      '• *hapus* — Hapus transaksi terakhir\n' +
      '• *bantuan* — Tampilkan menu ini'
    );
  }

  private async handleSessionState(user: User, session: WaSession, text: string) {
    // Handle expired session
    if (new Date() > session.expiresAt) {
      await this.sessionRepo.update(session.id, { state: 'idle', context: null });
      await this.handleTextMessage(user.waPhone, text);
      return;
    }
    // Re-route to text handler after resetting state (simple approach)
    await this.sessionRepo.update(session.id, { state: 'idle', context: null });
    await this.handleTextMessage(user.waPhone, text);
  }

  private async getOrCreateSession(waPhone: string): Promise<WaSession> {
    let session = await this.sessionRepo.findOne({ where: { waPhone } });
    if (!session) {
      session = this.sessionRepo.create({
        waPhone,
        state: 'idle',
        context: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await this.sessionRepo.save(session);
    }
    return session;
  }

  private normalizePhone(phone: string): string {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }
}
