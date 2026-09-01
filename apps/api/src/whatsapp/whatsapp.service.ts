/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WaSession } from './wa-session.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from '../categories/category.entity';
import { Budget } from '../budgets/budget.entity';
import { Debt } from '../debts/debt.entity';
import { WaNotifierService } from './wa-notifier.service';
import { MessageParserService } from './message-parser.service';
import { VoiceService } from './voice.service';
import { WaLinkChallenge } from './wa-link-challenge.entity';
import { WalletMember } from '../shared-wallet/wallet-member.entity';
import { WaProactiveNotificationService } from './wa-proactive-notification.service';
import { WA_TEMPLATE_DEFAULT_NAMES } from './wa-template-definitions';
import { WaPhoneLink } from './wa-phone-link.entity';
import { UpdateWaPhoneLinkDto } from './dto/update-wa-phone-link.dto';

const MAX_WHATSAPP_NUMBERS = 3;

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WaSession) private sessionRepo: Repository<WaSession>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(WaPhoneLink)
    private phoneLinkRepo: Repository<WaPhoneLink>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(WaLinkChallenge)
    private linkChallengeRepo: Repository<WaLinkChallenge>,
    @InjectRepository(WalletMember)
    private walletMemberRepo: Repository<WalletMember>,
    private notifier: WaNotifierService,
    private parser: MessageParserService,
    private voice: VoiceService,
    private jwt: JwtService,
    private config: ConfigService,
    private proactive: WaProactiveNotificationService,
  ) {}

  async getLinkStatus(userId: string) {
    const numbers = await this.phoneLinkRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { isPrimary: 'DESC', linkedAt: 'ASC' },
    });
    const primary = numbers.find((number) => number.isPrimary) ?? numbers[0];
    return {
      linked: numbers.length > 0,
      phone: primary ? this.maskPhone(primary.phone) : null,
      linkedAt: primary?.linkedAt ?? null,
      limit: MAX_WHATSAPP_NUMBERS,
      numbers: numbers.map((number) => this.serializePhoneLink(number)),
    };
  }

  async createLinkChallenge(userId: string, requestedLabel?: string) {
    if (
      !this.config.get<string>('WA_ACCESS_TOKEN') ||
      !this.config.get<string>('WA_PHONE_NUMBER_ID')
    ) {
      throw new ServiceUnavailableException(
        'Integrasi WhatsApp belum dikonfigurasi',
      );
    }
    const configuredNumber = this.config
      .get<string>('WA_BUSINESS_PHONE_NUMBER', '')
      .trim();
    if (!configuredNumber) {
      throw new ServiceUnavailableException(
        'Nomor WhatsApp bisnis belum dikonfigurasi',
      );
    }

    const businessPhone = this.normalizePhone(configuredNumber);
    if (!/^62\d{8,13}$/.test(businessPhone)) {
      throw new ServiceUnavailableException(
        'WA_BUSINESS_PHONE_NUMBER tidak valid',
      );
    }
    const activeCount = await this.phoneLinkRepo.count({
      where: { userId, revokedAt: IsNull() },
    });
    if (activeCount >= MAX_WHATSAPP_NUMBERS) {
      throw new ConflictException(
        `Maksimal ${MAX_WHATSAPP_NUMBERS} nomor WhatsApp per akun`,
      );
    }
    const label = this.normalizeLabel(
      requestedLabel,
      activeCount === 0 ? 'Utama' : `Nomor ${activeCount + 1}`,
    );
    const token = randomBytes(24).toString('base64url');
    const tokenHash = this.hashLinkToken(token);
    const lifetimeMinutes =
      Number(this.config.get<string>('WA_LINK_TOKEN_TTL_MINUTES', '10')) || 10;
    const expiresAt = new Date(Date.now() + lifetimeMinutes * 60_000);

    await this.linkChallengeRepo.delete({ userId });
    await this.linkChallengeRepo.save(
      this.linkChallengeRepo.create({
        userId,
        tokenHash,
        expiresAt,
        consumedAt: null,
        label,
      }),
    );

    const linkText = `HUBUNGKAN ${token}`;
    return {
      linkUrl: `https://wa.me/${businessPhone}?text=${encodeURIComponent(linkText)}`,
      businessPhone,
      expiresAt,
      label,
    };
  }

  async updatePhoneLink(
    userId: string,
    phoneLinkId: string,
    dto: UpdateWaPhoneLinkDto,
  ) {
    const link = await this.findOwnedActivePhoneLink(userId, phoneLinkId);
    if (dto.label !== undefined) {
      link.label = this.normalizeLabel(dto.label, link.label);
    }
    if (dto.notificationsEnabled !== undefined) {
      link.notificationsEnabled = dto.notificationsEnabled;
    }
    return this.serializePhoneLink(await this.phoneLinkRepo.save(link));
  }

  async setPrimaryPhone(userId: string, phoneLinkId: string) {
    await this.phoneLinkRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const linkRepo = manager.getRepository(WaPhoneLink);
      await userRepo
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOneOrFail();
      const selected = await linkRepo.findOne({
        where: { id: phoneLinkId, userId, revokedAt: IsNull() },
      });
      if (!selected) throw new NotFoundException('Nomor tidak ditemukan');
      await linkRepo.update(
        { userId, isPrimary: true, revokedAt: IsNull() },
        { isPrimary: false },
      );
      await linkRepo.update(selected.id, { isPrimary: true });
      await userRepo.update(userId, {
        waPhone: selected.phone,
        waLinkedAt: selected.linkedAt,
      });
    });
    return this.getLinkStatus(userId);
  }

  async unlinkPhone(userId: string, password: string, phoneLinkId?: string) {
    const credential = await this.userRepo.findOne({ where: { id: userId } });
    if (!credential || !(await bcrypt.compare(password, credential.password))) {
      throw new UnauthorizedException('Password tidak sesuai');
    }
    let revokedPhone: string | null = null;
    await this.phoneLinkRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const linkRepo = manager.getRepository(WaPhoneLink);
      await userRepo
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOneOrFail();
      const target = phoneLinkId
        ? await linkRepo.findOne({
            where: { id: phoneLinkId, userId, revokedAt: IsNull() },
          })
        : await linkRepo.findOne({
            where: { userId, isPrimary: true, revokedAt: IsNull() },
          });
      if (!target) throw new NotFoundException('Nomor tidak ditemukan');
      const activeCount = await linkRepo.count({
        where: { userId, revokedAt: IsNull() },
      });
      if (target.isPrimary && activeCount > 1) {
        throw new ConflictException(
          'Jadikan nomor lain sebagai nomor utama sebelum melepaskan nomor ini',
        );
      }
      revokedPhone = target.phone;
      await linkRepo.update(target.id, {
        revokedAt: new Date(),
        isPrimary: false,
        notificationsEnabled: false,
      });
      const remaining = await linkRepo.find({
        where: { userId, revokedAt: IsNull() },
        order: { linkedAt: 'ASC' },
      });
      if (remaining.length === 0) {
        await userRepo.update(userId, { waPhone: null, waLinkedAt: null });
      }
    });
    await this.linkChallengeRepo.delete({ userId });
    if (revokedPhone) await this.sessionRepo.delete({ waPhone: revokedPhone });
  }

  async handleTextMessage(from: string, text: string) {
    if (await this.tryConsumeLinkChallenge(from, text)) return;

    const actor = await this.resolvePhoneActor(from);
    if (!actor) {
      await this.notifier.sendText(
        from,
        '👋 Halo! Kamu belum menghubungkan nomor WA ini ke akun Money Flow.\n\n' +
          'Buka aplikasi → Settings → WhatsApp untuk menghubungkan.',
      );
      return;
    }
    const { user, phoneLink } = actor;

    const session = await this.getOrCreateSession(from);
    const trimmed = text.trim().toLowerCase();

    if (session.state !== 'idle') {
      await this.handleSessionState(user, session, text, from, phoneLink.id);
      return;
    }

    if (['saldo', 'balance'].includes(trimmed)) {
      await this.handleSaldo(user, from);
    } else if (
      ['rekap', 'laporan'].includes(trimmed) ||
      trimmed.startsWith('rekap ')
    ) {
      await this.handleRekap(user, trimmed, from);
    } else if (['hapus', 'batal', 'undo'].includes(trimmed)) {
      await this.handleHapus(user, session, from);
    } else if (['daftar', 'list'].includes(trimmed)) {
      await this.handleDaftar(user, from);
    } else if (['budget', 'anggaran'].includes(trimmed)) {
      await this.handleBudget(user, from);
    } else if (['utang', 'hutang', 'piutang'].includes(trimmed)) {
      await this.handleUtangList(user, from);
    } else if (/^(ekspor|export|unduh)(\s+(csv|xlsx))?$/.test(trimmed)) {
      await this.handleEkspor(
        user,
        trimmed.endsWith('xlsx') ? 'xlsx' : 'csv',
        from,
      );
    } else if (['bantuan', 'help', '?'].includes(trimmed)) {
      await this.handleBantuan(from);
    } else if (this.isDebtRecord(trimmed)) {
      await this.handleDebtRecord(user, text, from);
    } else if (this.isDebtSettle(trimmed)) {
      await this.handleDebtSettle(user, session, text, from);
    } else {
      const target = await this.resolveSharedWalletTarget(user, text, from);
      if (target)
        await this.handleTransactionInput(
          user,
          session,
          target.text,
          target.owner,
          from,
          phoneLink.id,
        );
    }
  }

  // ── VN-01 to VN-05: voice note → transcribe → parse → confirm → save ────────
  async handleAudioMessage(from: string, audioId: string) {
    const actor = await this.resolvePhoneActor(from);
    if (!actor) {
      await this.notifier.sendText(
        from,
        '👋 Kamu belum menghubungkan nomor WA ini. Buka Settings → WhatsApp.',
      );
      return;
    }
    const { user } = actor;

    if (!this.voice.isConfigured) {
      await this.notifier.sendText(
        from,
        '🎙️ Voice note belum aktif di server ini. Silakan ketik transaksimu, contoh: "kopi 15rb".',
      );
      return;
    }

    await this.notifier.sendText(
      from,
      '🎙️ Sedang mendengarkan voice note-mu...',
    );

    const transcript = await this.voice.transcribe(audioId);
    if (!transcript) {
      await this.notifier.sendText(
        from,
        '😕 Maaf, aku tidak bisa memahami voice note-nya. Coba rekam ulang atau ketik langsung.',
      );
      return;
    }

    const categories = await this.catRepo.find({ where: { userId: user.id } });
    const result = await this.parser.parse(transcript, categories, new Date());

    if (!result || result.transactions.length === 0) {
      await this.notifier.sendText(
        from,
        `🎙️ Kamu bilang: "${transcript}"\n\n` +
          '❓ Tapi aku tidak menemukan transaksi di dalamnya. Coba lagi ya.',
      );
      return;
    }

    // VN-04: preview transcript + parsed result and ask to confirm before saving
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const catName = (id: string | null) =>
      id ? (categories.find((c) => c.id === id)?.name ?? '') : '';
    let preview = `🎙️ Kamu bilang: "${transcript}"\n\n📝 Aku catat:\n`;
    for (const t of result.transactions) {
      const sign = t.type === 'income' ? '+' : '-';
      preview += `${sign}Rp${fmt(t.amount)} ${catName(t.categoryId)}${t.notes ? ` • ${t.notes}` : ''}\n`;
    }

    const session = await this.getOrCreateSession(from);
    await this.sessionRepo.update(session.id, {
      state: 'awaiting_voice_confirm',
      context: { transactions: result.transactions, transcript } as any,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.notifier.sendTextWithButtons(from, preview + '\nSimpan?', [
      { id: 'voice_save', title: 'Ya, simpan' },
      { id: 'voice_cancel', title: 'Bukan' },
    ]);
  }

  async handleButtonReply(from: string, replyId: string, _replyTitle: string) {
    void _replyTitle;
    const actor = await this.resolvePhoneActor(from);
    if (!actor) return;
    const { user, phoneLink } = actor;
    const session = await this.getOrCreateSession(from);

    if (session.state === 'awaiting_confirm_delete') {
      const txId = session.context?.txId;
      if (replyId === 'confirm_delete' && txId) {
        await this.txRepo.delete(txId);
        await this.sessionRepo.update(session.id, {
          state: 'idle',
          context: null,
        });
        await this.notifier.sendText(from, '✅ Transaksi berhasil dihapus.');
      } else {
        await this.sessionRepo.update(session.id, {
          state: 'idle',
          context: null,
        });
        await this.notifier.sendText(from, '❌ Penghapusan dibatalkan.');
      }
    } else if (session.state === 'awaiting_category') {
      const partial = session.context?.partial;
      if (partial && replyId.startsWith('cat_')) {
        const catId = replyId.replace('cat_', '');
        await this.saveTransaction(
          user,
          { ...partial, categoryId: catId },
          from,
          phoneLink.id,
        );
        await this.sessionRepo.update(session.id, {
          state: 'idle',
          context: null,
        });
      }
    } else if (session.state === 'awaiting_voice_confirm') {
      await this.resolveVoiceConfirm(
        user,
        session,
        replyId === 'voice_save',
        from,
        phoneLink.id,
      );
    } else if (session.state === 'awaiting_text_confirm') {
      await this.resolveTextConfirm(
        user,
        session,
        replyId === 'text_save',
        from,
        phoneLink.id,
      );
    } else if (session.state === 'awaiting_debt_settle') {
      if (replyId.startsWith('settle_')) {
        const debtId = replyId.replace('settle_', '');
        await this.settleDebtById(user, debtId, from);
      } else {
        await this.notifier.sendText(from, '❌ Dibatalkan.');
      }
      await this.sessionRepo.update(session.id, {
        state: 'idle',
        context: null,
      });
    }
  }

  // VN-04/05: apply or discard the transactions parsed from a voice note.
  private async resolveVoiceConfirm(
    user: User,
    session: WaSession,
    save: boolean,
    from: string,
    phoneLinkId: string,
  ) {
    const transactions: any[] = session.context?.transactions ?? [];
    await this.sessionRepo.update(session.id, { state: 'idle', context: null });

    if (!save) {
      await this.notifier.sendText(
        from,
        '❌ Oke, dibatalkan. Rekam ulang atau ketik ya.',
      );
      return;
    }

    let saved = 0;
    for (const tx of transactions) {
      if (!tx.categoryId) {
        const categories = await this.catRepo.find({
          where: { userId: user.id },
        });
        const fallback = categories.find(
          (c) => c.type === tx.type || c.type === 'both',
        );
        tx.categoryId = fallback?.id ?? null;
      }
      if (tx.categoryId) {
        await this.saveTransaction(user, tx, from, phoneLinkId);
        saved++;
      }
    }
    if (saved > 1) {
      await this.notifier.sendText(
        from,
        `✅ ${saved} transaksi dari voice note tersimpan!`,
      );
    } else if (saved === 0) {
      await this.notifier.sendText(
        from,
        '😕 Tidak ada transaksi yang bisa disimpan.',
      );
    }
  }

  private async handleTransactionInput(
    user: User,
    session: WaSession,
    text: string,
    targetOwner: User | null = null,
    from: string,
    phoneLinkId: string,
  ) {
    const categories = await this.catRepo.find({
      where: { userId: targetOwner?.id ?? user.id },
    });
    const result = await this.parser.parse(text, categories, new Date());

    if (!result || result.transactions.length === 0) {
      await this.notifier.sendText(
        from,
        '❓ Maaf, tidak bisa memahami pesanmu.\n\n' +
          'Coba format: "kopi 15rb" atau "gajian 5jt"\n' +
          'Ketik *bantuan* untuk melihat semua perintah.',
      );
      return;
    }

    for (const tx of result.transactions)
      (tx as any).targetOwnerId = targetOwner?.id ?? null;
    const lowConfidence = result.transactions.some(
      (tx) =>
        tx.confidence < 0.8 ||
        tx.ambiguousFields.includes('amount') ||
        tx.ambiguousFields.includes('type'),
    );
    if (lowConfidence) {
      const fmt = (amount: number) =>
        new Intl.NumberFormat('id-ID').format(amount);
      const preview = result.transactions
        .map((tx) => {
          const sign = tx.type === 'income' ? '+' : '-';
          const category =
            categories.find((item) => item.id === tx.categoryId)?.name ??
            'tanpa kategori';
          return `${sign}Rp${fmt(tx.amount)} â€¢ ${category}${tx.notes ? ` â€¢ ${tx.notes}` : ''}`;
        })
        .join('\n');
      await this.sessionRepo.update(session.id, {
        state: 'awaiting_text_confirm',
        context: { transactions: result.transactions } as any,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await this.notifier.sendTextWithButtons(
        from,
        `Aku belum sepenuhnya yakin:\n${preview}\n\nData ini sudah benar?`,
        [
          { id: 'text_save', title: 'Ya, simpan' },
          { id: 'text_cancel', title: 'Batal' },
        ],
      );
      return;
    }

    let saved = 0;
    for (const tx of result.transactions) {
      if (!tx.categoryId) {
        const options = categories
          .filter((c) => c.type === tx.type || c.type === 'both')
          .slice(0, 3)
          .map((c) => ({ id: `cat_${c.id}`, title: c.name }));

        await this.sessionRepo.update(session.id, {
          state: 'awaiting_category',
          context: { partial: tx } as any,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await this.notifier.sendTextWithButtons(
          from,
          `❓ "${tx.notes || text}" — ini untuk kategori apa?`,
          options,
        );
        return;
      }
      await this.saveTransaction(user, tx, from, phoneLinkId);
      saved++;
    }

    if (saved > 1) {
      await this.notifier.sendText(
        from,
        `✅ ${saved} transaksi berhasil dicatat!`,
      );
    }
  }

  private async saveTransaction(
    user: User,
    tx: any,
    from: string,
    phoneLinkId: string,
  ) {
    const targetOwner = tx.targetOwnerId
      ? await this.userRepo.findOne({ where: { id: tx.targetOwnerId } })
      : null;
    const saved = this.txRepo.create({
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      date: tx.date || new Date().toISOString().split('T')[0],
      notes: tx.notes || undefined,
      userId: targetOwner?.id ?? user.id,
      source: targetOwner ? 'shared' : 'whatsapp',
      recordedBy: user.id,
      recordedByWaPhoneId: phoneLinkId,
    });
    await this.txRepo.save(saved);

    const cat = await this.catRepo.findOne({ where: { id: tx.categoryId } });
    const sign = tx.type === 'income' ? '+' : '-';
    const amount = new Intl.NumberFormat('id-ID').format(tx.amount);
    await this.notifier.sendText(
      from,
      `✅ Tercatat: ${sign}Rp${amount} ${cat?.name ?? ''}${tx.notes ? ' • ' + tx.notes : ''}`,
    );
    if (targetOwner && targetOwner.id !== user.id) {
      const targetPhone = await this.getPrimaryPhoneLink(targetOwner.id);
      if (!targetPhone) return;
      await this.proactive.sendOncePerDay({
        userId: targetOwner.id,
        to: targetPhone.phone,
        waPhoneLinkId: targetPhone.id,
        kind: `shared_wallet_activity:${saved.id}`,
        templateName: this.config.get<string>(
          'WA_TEMPLATE_SHARED_WALLET',
          WA_TEMPLATE_DEFAULT_NAMES.sharedWallet,
        ),
        bodyParameters: [
          user.name,
          `${sign}Rp${amount}`,
          cat?.name ?? 'Tanpa kategori',
          tx.notes || '-',
        ],
      });
    }
  }

  private async resolveSharedWalletTarget(
    user: User,
    text: string,
    from: string,
  ): Promise<{ text: string; owner: User | null } | null> {
    const match = text.match(/^dompet\s+([^:]{1,60}):\s*(.+)$/i);
    if (!match) return { text, owner: null };
    const memberships = await this.walletMemberRepo.find({
      where: { memberUserId: user.id },
      relations: { owner: true },
    });
    const wanted = match[1].trim().toLowerCase();
    const membership = memberships.find(
      (item) =>
        !!item.acceptedAt && item.owner?.name.toLowerCase().includes(wanted),
    );
    if (!membership?.owner) {
      await this.notifier.sendText(
        from,
        `Dompet "${match[1].trim()}" tidak ditemukan atau belum diterima.`,
      );
      return null;
    }
    return { text: match[2].trim(), owner: membership.owner };
  }

  private async resolveTextConfirm(
    user: User,
    session: WaSession,
    save: boolean,
    from: string,
    phoneLinkId: string,
  ) {
    const transactions: any[] = session.context?.transactions ?? [];
    await this.sessionRepo.update(session.id, { state: 'idle', context: null });
    if (!save) {
      await this.notifier.sendText(
        from,
        'Dibatalkan. Kirim ulang dengan nominal, tipe, dan kategori yang lebih jelas.',
      );
      return;
    }
    for (const tx of transactions)
      await this.saveTransaction(user, tx, from, phoneLinkId);
  }

  private async handleSaldo(user: User, from: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const txs = await this.txRepo.find({
      where: { userId: user.id, date: Between(start, end) },
    });

    const income = txs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const month = now.toLocaleString('id-ID', {
      month: 'long',
      year: 'numeric',
    });

    await this.notifier.sendText(
      from,
      `💰 *Saldo ${month}*\n\n` +
        `📈 Pemasukan: +Rp${fmt(income)}\n` +
        `📉 Pengeluaran: -Rp${fmt(expense)}\n` +
        `💵 Saldo bersih: Rp${fmt(income - expense)}`,
    );
  }

  private async handleRekap(user: User, cmd: string, from: string) {
    const now = new Date();
    let start: string, end: string, label: string;

    if (cmd.includes('minggu')) {
      const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = s.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
      label = '7 hari terakhir';
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      label = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    }

    const txs = await this.txRepo.find({
      where: { userId: user.id, date: Between(start, end) },
      relations: { category: true },
    });

    const expense = txs.filter((t) => t.type === 'expense');
    const catTotals = new Map<string, number>();
    for (const tx of expense) {
      const name = tx.category?.name ?? 'Lain-lain';
      catTotals.set(name, (catTotals.get(name) ?? 0) + Number(tx.amount));
    }
    const top3 = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

    let msg = `📊 *Rekap ${label}*\n\n📉 Total pengeluaran: -Rp${fmt(totalExpense)}\n\n`;
    if (top3.length) {
      msg += `🏆 Top kategori:\n`;
      top3.forEach(([name, total], i) => {
        const pct =
          totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
        msg += `${i + 1}. ${name}: Rp${fmt(total)} (${pct}%)\n`;
      });
    }
    await this.notifier.sendText(from, msg);
  }

  private async handleHapus(user: User, session: WaSession, from: string) {
    const last = await this.txRepo.findOne({
      where: { userId: user.id, source: 'whatsapp' },
      order: { createdAt: 'DESC' },
    });

    if (!last) {
      await this.notifier.sendText(
        from,
        '❌ Tidak ada transaksi WA terbaru untuk dihapus.',
      );
      return;
    }

    const sign = last.type === 'income' ? '+' : '-';
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

    await this.sessionRepo.update(session.id, {
      state: 'awaiting_confirm_delete',
      context: { txId: last.id } as any,
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

  private async handleDaftar(user: User, from: string) {
    const txs = await this.txRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { category: true },
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

  // ── CMD-06: budget status per category for the current month ────────────────
  private async handleBudget(user: User, from: string) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const budgets = await this.budgetRepo.find({
      where: { userId: user.id, month },
    });
    if (!budgets.length) {
      await this.notifier.sendText(
        from,
        '💼 Belum ada budget untuk bulan ini.\n\nAtur budget lewat dashboard → menu Budget.',
      );
      return;
    }

    const txs = await this.txRepo.find({
      where: { userId: user.id, type: 'expense', date: Between(start, end) },
    });
    const cats = await this.catRepo.find({ where: { userId: user.id } });
    const catName = (id: string) =>
      cats.find((c) => c.id === id)?.name ?? 'Lainnya';

    const spentByCat = new Map<string, number>();
    for (const tx of txs) {
      if (!tx.categoryId) continue;
      spentByCat.set(
        tx.categoryId,
        (spentByCat.get(tx.categoryId) ?? 0) + Number(tx.amount),
      );
    }

    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const label = now.toLocaleString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
    let msg = `💼 *Budget ${label}*\n\n`;
    for (const b of budgets) {
      const spent = spentByCat.get(b.categoryId) ?? 0;
      const limit = Number(b.amount);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const icon = pct >= 100 ? '🔴' : pct >= 80 ? '🟠' : '🟢';
      msg += `${icon} ${catName(b.categoryId)}: Rp${fmt(spent)} / Rp${fmt(limit)} (${pct}%)\n`;
    }
    await this.notifier.sendText(from, msg);
  }

  // ── CMD-07: list active (unsettled) debts ───────────────────────────────────
  private async handleUtangList(user: User, from: string) {
    const debts = await this.debtRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    const active = debts.filter((d) => !d.settledAt);
    if (!active.length) {
      await this.notifier.sendText(
        from,
        '📒 Tidak ada utang piutang aktif. 🎉',
      );
      return;
    }

    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const piutang = active.filter((d) => d.direction === 'owed_to_me');
    const hutang = active.filter((d) => d.direction === 'i_owe');
    let msg = '📒 *Utang Piutang Aktif*\n';
    if (piutang.length) {
      msg += '\n💰 *Piutang (mereka hutang ke kamu):*\n';
      for (const d of piutang) {
        msg += `• ${d.counterpartyName}: Rp${fmt(Number(d.amount))}${d.dueDate ? ` — jatuh tempo ${d.dueDate}` : ''}\n`;
      }
    }
    if (hutang.length) {
      msg += '\n💸 *Hutang (kamu hutang ke mereka):*\n';
      for (const d of hutang) {
        msg += `• ${d.counterpartyName}: Rp${fmt(Number(d.amount))}${d.dueDate ? ` — jatuh tempo ${d.dueDate}` : ''}\n`;
      }
    }
    msg += '\nUntuk tandai lunas: ketik "<nama> udah bayar".';
    await this.notifier.sendText(from, msg);
  }

  // ── DEBT-01/02: record a debt from chat ─────────────────────────────────────
  // "pinjam ke budi 100rb" / "budi pinjam 100rb" → piutang (owed_to_me)
  // "hutang ke ani 50rb" / "ngutang ke ani 50rb" → hutang (i_owe)
  private isDebtRecord(lower: string): boolean {
    if (!/\d/.test(lower)) return false;
    // "pinjam ke X", "piutang ...", or "hutang/utang/ngutang ke X".
    // Requires "ke" for the hutang/utang words so "bayar hutang 100rb" (an
    // expense) is not mistaken for a debt entry.
    return (
      /\bpinjam\b/.test(lower) ||
      /\bpiutang\b/.test(lower) ||
      /\b(hutang|utang|ngutang)\s+ke\b/.test(lower)
    );
  }

  private async handleDebtRecord(user: User, text: string, from: string) {
    const lower = text.toLowerCase();

    // Amount
    const amountMatch = lower.match(
      /(\d[\d.,]*)\s*(rb|ribu|k|jt|juta|m|miliar)?/,
    );
    if (!amountMatch) {
      await this.notifier.sendText(
        from,
        '❓ Nominal tidak terbaca. Contoh: "pinjam ke budi 100rb"',
      );
      return;
    }
    let amount = parseFloat(
      amountMatch[1].replace(/\./g, '').replace(',', '.'),
    );
    const unit = (amountMatch[2] || '').toLowerCase();
    if (['rb', 'ribu', 'k'].includes(unit)) amount *= 1000;
    else if (['jt', 'juta'].includes(unit)) amount *= 1_000_000;
    else if (['m', 'miliar'].includes(unit)) amount *= 1_000_000_000;

    // Direction: "hutang ke" / "ngutang ke" / "utang ke" = I owe (i_owe).
    // "pinjam ke X" (I lend to X) / "piutang" / "X pinjam" = owed_to_me.
    const iOwe = /\b(hutang|ngutang|utang)\s+ke\b/.test(lower);
    const direction: 'owed_to_me' | 'i_owe' = iOwe ? 'i_owe' : 'owed_to_me';

    // Counterparty name: word after "ke", else first non-keyword token.
    let name = '';
    const keMatch = lower.match(/\bke\s+([a-z][a-z\s]*?)(?=\s*\d|\s*$)/);
    if (keMatch) name = keMatch[1].trim();
    if (!name) {
      const cleaned = lower
        .replace(/\b(pinjam|piutang|hutang|utang|ngutang|ke)\b/g, ' ')
        .replace(amountMatch[0], ' ')
        .replace(/\s+/g, ' ')
        .trim();
      name = cleaned.split(' ')[0] ?? '';
    }
    name = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Tanpa nama';

    const debt = this.debtRepo.create({
      userId: user.id,
      direction,
      amount,
      counterpartyName: name,
      notes: null,
      dueDate: null,
      settledAt: null,
    });
    await this.debtRepo.save(debt);

    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const msg =
      direction === 'owed_to_me'
        ? `✅ Tercatat: *${name}* hutang Rp${fmt(amount)} ke kamu (piutang).`
        : `✅ Tercatat: kamu hutang Rp${fmt(amount)} ke *${name}*.`;
    await this.notifier.sendText(from, msg);
  }

  // ── DEBT-03: settle a debt from chat ("budi udah bayar", "lunas ani") ───────
  private isDebtSettle(lower: string): boolean {
    return (
      /\b(udah|sudah|udh)\s+(bayar|lunas)\b/.test(lower) ||
      /\blunas\b/.test(lower)
    );
  }

  private async handleDebtSettle(
    user: User,
    session: WaSession,
    text: string,
    from: string,
  ) {
    const lower = text.toLowerCase();
    const nameToken = lower
      .replace(/\b(udah|sudah|udh|bayar|lunas|utang|hutang|piutang)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const active = (
      await this.debtRepo.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      })
    ).filter((d) => !d.settledAt);

    if (!active.length) {
      await this.notifier.sendText(
        from,
        '📒 Tidak ada utang piutang aktif untuk dilunaskan.',
      );
      return;
    }

    const matches = nameToken
      ? active.filter((d) =>
          d.counterpartyName.toLowerCase().includes(nameToken.split(' ')[0]),
        )
      : active;

    if (matches.length === 1) {
      await this.settleDebtById(user, matches[0].id, from);
      return;
    }

    // Ambiguous → ask which one via buttons (max 3)
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    const options = matches.slice(0, 3).map((d) => ({
      id: `settle_${d.id}`,
      title: `${d.counterpartyName} ${fmt(Number(d.amount))}`,
    }));
    await this.sessionRepo.update(session.id, {
      state: 'awaiting_debt_settle',
      context: {},
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await this.notifier.sendTextWithButtons(
      from,
      'Utang/piutang mana yang lunas?',
      options,
    );
  }

  private async settleDebtById(user: User, debtId: string, from: string) {
    const debt = await this.debtRepo.findOne({
      where: { id: debtId, userId: user.id },
    });
    if (!debt) {
      await this.notifier.sendText(from, '❌ Data tidak ditemukan.');
      return;
    }
    debt.settledAt = new Date();
    await this.debtRepo.save(debt);
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
    await this.notifier.sendText(
      from,
      `✅ ${debt.counterpartyName} Rp${fmt(Number(debt.amount))} ditandai *lunas*.`,
    );
  }

  // ── CMD-09: generate a 1-hour signed CSV export link ────────────────────────
  private async handleEkspor(user: User, format: 'csv' | 'xlsx', from: string) {
    const token = this.jwt.sign(
      { sub: user.id, purpose: 'wa-export' },
      { expiresIn: '1h' },
    );
    const baseUrl = this.config
      .get<string>('PUBLIC_API_URL', 'http://localhost:3001/api')
      .replace(/\/$/, '');
    const url = `${baseUrl}/export/transactions?token=${token}&format=${format}`;
    await this.notifier.sendText(
      from,
      '📤 *Ekspor transaksi bulan ini*\n\n' +
        `Unduh ${format.toUpperCase()} di sini (berlaku 1 jam):\n${url}`,
    );
  }

  private async handleBantuan(from: string) {
    await this.notifier.sendText(
      from,
      '📖 *Panduan Money Flow Bot*\n\n' +
        '*Catat transaksi:*\n' +
        '• kopi 15rb\n' +
        '• gajian 8jt\n' +
        '• bensin 50k, parkir 3k\n' +
        '• 🎙️ atau kirim voice note!\n\n' +
        '*Utang piutang:*\n' +
        '• pinjam ke budi 100rb\n' +
        '• hutang ke ani 50rb\n' +
        '• budi udah bayar\n\n' +
        '*Perintah:*\n' +
        '• *saldo* — Ringkasan bulan ini\n' +
        '• *rekap* — Laporan bulanan\n' +
        '• *rekap minggu ini* — Laporan 7 hari\n' +
        '• *budget* — Status budget per kategori\n' +
        '• *utang* — Daftar utang piutang aktif\n' +
        '• *daftar* — 5 transaksi terakhir\n' +
        '• *hapus* — Hapus transaksi WA terakhir\n' +
        '• *ekspor* — Link unduh CSV bulan ini\n' +
        '• *bantuan* — Tampilkan menu ini',
    );
  }

  private async handleSessionState(
    user: User,
    session: WaSession,
    text: string,
    from: string,
    phoneLinkId: string,
  ) {
    const expired = new Date() > session.expiresAt;

    // VN-05: allow confirming/cancelling a voice note by typing (not just buttons)
    if (
      !expired &&
      ['awaiting_voice_confirm', 'awaiting_text_confirm'].includes(
        session.state,
      )
    ) {
      const t = text.trim().toLowerCase();
      const yes = [
        'ya',
        'iya',
        'betul',
        'benar',
        'ok',
        'oke',
        'simpan',
        'y',
      ].includes(t);
      const no = [
        'bukan',
        'salah',
        'batal',
        'tidak',
        'gak',
        'nggak',
        'no',
        'n',
      ].includes(t);
      if (yes || no) {
        if (session.state === 'awaiting_voice_confirm')
          await this.resolveVoiceConfirm(user, session, yes, from, phoneLinkId);
        else
          await this.resolveTextConfirm(user, session, yes, from, phoneLinkId);
        return;
      }
      // Any other text → discard the pending voice note and treat as a fresh message
    }

    await this.sessionRepo.update(session.id, { state: 'idle', context: null });
    await this.handleTextMessage(from, text);
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

  private async resolvePhoneActor(
    phone: string,
  ): Promise<{ user: User; phoneLink: WaPhoneLink } | null> {
    const normalized = this.normalizePhone(phone);
    const phoneLink = await this.phoneLinkRepo.findOne({
      where: { phone: normalized, revokedAt: IsNull() },
      relations: { user: true },
    });
    if (!phoneLink?.user) return null;
    await this.phoneLinkRepo.update(phoneLink.id, {
      lastInboundAt: new Date(),
    });
    return { user: phoneLink.user, phoneLink };
  }

  async getActivePhoneOwnerId(phone: string): Promise<string | null> {
    const link = await this.phoneLinkRepo.findOne({
      where: { phone: this.normalizePhone(phone), revokedAt: IsNull() },
      select: { userId: true },
    });
    return link?.userId ?? null;
  }

  private getPrimaryPhoneLink(userId: string): Promise<WaPhoneLink | null> {
    return this.phoneLinkRepo.findOne({
      where: { userId, isPrimary: true, revokedAt: IsNull() },
    });
  }

  private async findOwnedActivePhoneLink(
    userId: string,
    phoneLinkId: string,
  ): Promise<WaPhoneLink> {
    const link = await this.phoneLinkRepo.findOne({
      where: { id: phoneLinkId, userId, revokedAt: IsNull() },
    });
    if (!link) throw new NotFoundException('Nomor tidak ditemukan');
    return link;
  }

  private serializePhoneLink(link: WaPhoneLink) {
    return {
      id: link.id,
      phone: this.maskPhone(link.phone),
      label: link.label,
      isPrimary: link.isPrimary,
      notificationsEnabled: link.notificationsEnabled,
      linkedAt: link.linkedAt,
      lastInboundAt: link.lastInboundAt,
    };
  }

  private normalizeLabel(value: string | undefined, fallback: string): string {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    if (!normalized) return fallback;
    if (normalized.length > 30) {
      throw new BadRequestException('Label maksimal 30 karakter');
    }
    return normalized;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 6) return `+${phone}`;
    return `+${phone.slice(0, 4)}${'*'.repeat(Math.max(4, phone.length - 8))}${phone.slice(-4)}`;
  }

  private normalizePhone(phone: string): string {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  private async tryConsumeLinkChallenge(
    from: string,
    text: string,
  ): Promise<boolean> {
    const trimmed = text.trim();
    if (!/^hubungkan\b/i.test(trimmed)) return false;

    const match = trimmed.match(/^hubungkan\s+([A-Za-z0-9_-]{20,100})$/i);
    if (!match) {
      await this.notifier.sendText(
        from,
        'Link tidak valid. Buat link baru dari Settings → WhatsApp.',
      );
      return true;
    }

    const tokenHash = this.hashLinkToken(match[1]);
    const challenge = await this.linkChallengeRepo.findOne({
      where: { tokenHash },
    });
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      await this.notifier.sendText(
        from,
        'Link sudah tidak valid atau kedaluwarsa. Buat link baru dari aplikasi.',
      );
      return true;
    }

    const normalizedFrom = this.normalizePhone(from);
    const ownerLink = await this.phoneLinkRepo.findOne({
      where: { phone: normalizedFrom, revokedAt: IsNull() },
    });
    if (ownerLink && ownerLink.userId !== challenge.userId) {
      await this.notifier.sendText(
        from,
        'Nomor WhatsApp ini sudah terhubung ke akun MoneyFlow lain.',
      );
      return true;
    }

    try {
      await this.linkChallengeRepo.manager.transaction(async (manager) => {
        const challengeRepo = manager.getRepository(WaLinkChallenge);
        const userRepo = manager.getRepository(User);
        const phoneLinkRepo = manager.getRepository(WaPhoneLink);
        const current = await challengeRepo
          .createQueryBuilder('challenge')
          .setLock('pessimistic_write')
          .where('challenge.id = :id', { id: challenge.id })
          .getOne();
        if (
          !current ||
          current.consumedAt ||
          current.expiresAt.getTime() <= Date.now()
        ) {
          throw new ConflictException(
            'Link WhatsApp sudah digunakan atau kedaluwarsa',
          );
        }
        await userRepo
          .createQueryBuilder('user')
          .setLock('pessimistic_write')
          .where('user.id = :userId', { userId: current.userId })
          .getOneOrFail();

        const existing = await phoneLinkRepo.findOne({
          where: { phone: normalizedFrom, revokedAt: IsNull() },
        });
        if (existing && existing.userId !== current.userId) {
          throw new ConflictException(
            'Nomor WhatsApp ini sudah terhubung ke akun MoneyFlow lain',
          );
        }
        if (!existing) {
          const activeCount = await phoneLinkRepo.count({
            where: { userId: current.userId, revokedAt: IsNull() },
          });
          if (activeCount >= MAX_WHATSAPP_NUMBERS) {
            throw new ConflictException(
              `Maksimal ${MAX_WHATSAPP_NUMBERS} nomor WhatsApp per akun`,
            );
          }
          const linkedAt = new Date();
          const isPrimary = activeCount === 0;
          await phoneLinkRepo.save(
            phoneLinkRepo.create({
              userId: current.userId,
              phone: normalizedFrom,
              label: this.normalizeLabel(
                current.label ?? undefined,
                isPrimary ? 'Utama' : `Nomor ${activeCount + 1}`,
              ),
              isPrimary,
              notificationsEnabled: isPrimary,
              linkedAt,
              lastInboundAt: linkedAt,
              revokedAt: null,
            }),
          );
          if (isPrimary) {
            await userRepo.update(current.userId, {
              waPhone: normalizedFrom,
              waLinkedAt: linkedAt,
            });
          }
        }
        await challengeRepo.update(current.id, { consumedAt: new Date() });
      });
    } catch (error) {
      const databaseError = error as {
        code?: string;
        driverError?: { code?: string };
      };
      if (
        error instanceof ConflictException ||
        databaseError.code === '23505' ||
        databaseError.driverError?.code === '23505'
      ) {
        await this.notifier.sendText(
          normalizedFrom,
          'Link tidak dapat digunakan. Nomor mungkin sudah terhubung atau kapasitas akun telah penuh.',
        );
        return true;
      }
      throw error;
    }

    await this.notifier.sendText(
      normalizedFrom,
      '✅ WhatsApp berhasil dihubungkan ke MoneyFlow. Ketik *bantuan* untuk melihat perintah.',
    );
    return true;
  }

  private hashLinkToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
