import { Injectable } from '@nestjs/common';
import { Category } from '../categories/category.entity';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  date: string;
  notes: string | null;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
}

/**
 * Non-AI, rule/template-based parser for WhatsApp messages.
 *
 * This is the fallback used whenever Gemini is unavailable, unconfigured,
 * or has hit its free-tier quota. It relies only on keyword matching and
 * regular expressions, so it has no rate limit and responds instantly.
 *
 * Supported input styles:
 *  - Free text:        "kopi 15rb", "gajian 8jt", "bensin 50k, parkir 3k"
 *  - Explicit category: "makan siang 25rb #food" or "beli buku 100rb kategori:belanja"
 *  - Relative dates:    "bayar listrik 150rb kemarin"
 */
@Injectable()
export class TemplateParserService {
  // Concept → keywords in the message, plus category-name aliases (ID + EN)
  // so it matches whether the user's categories are Indonesian or English.
  private readonly CONCEPTS: {
    type: 'income' | 'expense';
    keywords: string[];
    catAliases: string[];
  }[] = [
    {
      type: 'expense',
      keywords: [
        'makan', 'makanan', 'kopi', 'ngopi', 'nasi', 'soto', 'bakso', 'mie', 'pizza',
        'ayam', 'snack', 'jajan', 'minum', 'minuman', 'warung', 'resto', 'cafe', 'gofood',
        'grabfood', 'sarapan', 'siang', 'malam', 'brunch', 'kue', 'roti', 'es',
      ],
      catAliases: ['makan', 'food', 'kuliner', 'jajan'],
    },
    {
      type: 'expense',
      keywords: [
        'bensin', 'bbm', 'pertalite', 'pertamax', 'solar', 'grab', 'gojek', 'ojek', 'ojol',
        'taxi', 'taksi', 'parkir', 'tol', 'bus', 'kereta', 'krl', 'mrt', 'angkot', 'travel',
        'tiket', 'pesawat', 'transport', 'transportasi',
      ],
      catAliases: ['transport', 'transportasi', 'kendaraan'],
    },
    {
      type: 'expense',
      keywords: [
        'beli', 'belanja', 'baju', 'celana', 'sepatu', 'sandal', 'tas', 'tokped', 'tokopedia',
        'shopee', 'lazada', 'mall', 'toko', 'skincare', 'kosmetik', 'elektronik', 'gadget',
      ],
      catAliases: ['belanja', 'shopping', 'shop'],
    },
    {
      type: 'expense',
      keywords: [
        'listrik', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'telpon', 'telepon',
        'pulsa', 'paket', 'kuota', 'token', 'cicilan', 'kredit', 'angsuran', 'iuran',
        'tagihan', 'sewa', 'kontrakan', 'kos', 'pajak', 'bpjs', 'asuransi',
      ],
      catAliases: ['tagihan', 'bills', 'bill', 'utilitas'],
    },
    {
      type: 'expense',
      keywords: [
        'nonton', 'bioskop', 'film', 'game', 'games', 'netflix', 'spotify', 'youtube',
        'disney', 'konser', 'karaoke', 'liburan', 'wisata', 'hiburan', 'main',
      ],
      catAliases: ['hiburan', 'entertainment', 'fun'],
    },
    {
      type: 'expense',
      keywords: [
        'dokter', 'obat', 'apotek', 'apotik', 'rs', 'rumah sakit', 'klinik', 'vitamin',
        'medical', 'periksa', 'vaksin', 'gigi', 'kesehatan',
      ],
      catAliases: ['kesehatan', 'health', 'medis'],
    },
    {
      type: 'income',
      keywords: [
        'gajian', 'gaji', 'salary', 'thr', 'bonus', 'upah',
      ],
      catAliases: ['gaji', 'salary', 'income', 'pendapatan'],
    },
    {
      type: 'income',
      keywords: [
        'dividen', 'bunga', 'saham', 'crypto', 'investasi', 'profit', 'return', 'reksadana',
      ],
      catAliases: ['investasi', 'investment', 'invest'],
    },
  ];

  private readonly INCOME_WORDS = [
    'gajian', 'gaji', 'terima', 'diterima', 'dapat', 'dapet', 'masuk', 'bayaran',
    'fee', 'honor', 'thr', 'bonus', 'refund', 'cashback', 'jual', 'komisi', 'dividen',
  ];

  private readonly DAY_NAMES: Record<string, number> = {
    minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6,
  };

  parse(text: string, categories: Category[], now: Date): ParseResult {
    const todayStr = this.toDateStr(now);
    const transactions: ParsedTransaction[] = [];

    // Split multiple transactions separated by comma / semicolon / " dan "
    const parts = text
      .split(/,|;|\bdan\b/i)
      .map(p => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      const tx = this.parseOnePart(part, categories, now, todayStr);
      if (tx) transactions.push(tx);
    }

    return { transactions };
  }

  private parseOnePart(
    text: string,
    categories: Category[],
    now: Date,
    todayStr: string,
  ): ParsedTransaction | null {
    const lower = text.toLowerCase();

    // Amount: 15rb / 15k / 15.000 / 1,5jt / 1.5juta / +8jt
    const amountMatch = lower.match(/(\d[\d.,]*)\s*(rb|ribu|k|jt|juta|m|miliar|jeti)?/i);
    if (!amountMatch) return null;

    const amount = this.parseAmount(amountMatch[1], amountMatch[2]);
    if (!amount || amount <= 0) return null;

    // Explicit category override: "#food", "kategori:belanja", "kat:makan"
    const explicitCat = this.matchExplicitCategory(lower, categories);

    const type: 'income' | 'expense' =
      text.trim().startsWith('+') || this.INCOME_WORDS.some(w => this.hasWord(lower, w))
        ? 'income'
        : 'expense';

    const categoryId = explicitCat ?? this.matchCategory(lower, type, categories);
    const date = this.parseDate(lower, now, todayStr);

    // Notes = text without amount token, currency markers, and explicit-cat tag
    const notes =
      text
        .replace(amountMatch[0], '')
        .replace(/#\w+/g, '')
        .replace(/\b(kategori|kat)\s*:\s*\S+/gi, '')
        .replace(/^[+\-\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim() || null;

    return { amount, type, categoryId, date, notes };
  }

  private parseAmount(raw: string, unit?: string): number {
    const u = (unit || '').toLowerCase();
    let numeric: number;

    if (['rb', 'ribu', 'k', 'jt', 'juta', 'm', 'miliar', 'jeti'].includes(u)) {
      // Unit present: treat "." and "," as decimal separators (1,5jt -> 1.5)
      numeric = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    } else {
      // No unit: "." and "," are thousands separators (15.000 -> 15000)
      numeric = parseFloat(raw.replace(/[.,]/g, ''));
    }
    if (isNaN(numeric)) return 0;

    if (['rb', 'ribu', 'k'].includes(u)) numeric *= 1_000;
    else if (['jt', 'juta', 'jeti'].includes(u)) numeric *= 1_000_000;
    else if (['m', 'miliar'].includes(u)) numeric *= 1_000_000_000;

    return Math.round(numeric);
  }

  private matchExplicitCategory(lower: string, categories: Category[]): string | null {
    const tagMatch =
      lower.match(/#(\w+)/) || lower.match(/\b(?:kategori|kat)\s*:\s*(\w+)/);
    if (!tagMatch) return null;
    const wanted = tagMatch[1].toLowerCase();
    const matched = categories.find(
      c => c.name.toLowerCase() === wanted || c.name.toLowerCase().includes(wanted),
    );
    return matched?.id ?? null;
  }

  private matchCategory(
    lower: string,
    type: 'income' | 'expense',
    categories: Category[],
  ): string | null {
    const targetTypes = type === 'income' ? ['income', 'both'] : ['expense', 'both'];
    const validCats = categories.filter(c => targetTypes.includes(c.type));
    if (!validCats.length) return null;

    // 1) If the message literally contains a category's own name, use it.
    for (const cat of validCats) {
      if (this.hasWord(lower, cat.name.toLowerCase())) return cat.id;
    }

    // 2) Concept keyword matching → category alias matching.
    for (const concept of this.CONCEPTS) {
      if (concept.type !== type && concept.type !== ('both' as any)) {
        // still allow income concepts only for income, expense for expense
        if (concept.type !== type) continue;
      }
      if (concept.keywords.some(kw => this.hasWord(lower, kw))) {
        const matched = validCats.find(c =>
          concept.catAliases.some(alias => c.name.toLowerCase().includes(alias)),
        );
        if (matched) return matched.id;
      }
    }

    // 3) Income with no match → first salary-like category.
    if (type === 'income') {
      const salary = validCats.find(c =>
        ['gaji', 'salary', 'income', 'pendapatan'].some(a => c.name.toLowerCase().includes(a)),
      );
      if (salary) return salary.id;
    }

    // 4) Fallback to an "Other/Lainnya" category if present.
    const other = validCats.find(c =>
      ['other', 'lain', 'lainnya', 'misc'].some(a => c.name.toLowerCase().includes(a)),
    );
    return other?.id ?? null;
  }

  private parseDate(lower: string, now: Date, todayStr: string): string {
    if (this.hasWord(lower, 'kemarin') || this.hasWord(lower, 'kmrn')) {
      return this.shiftDate(now, -1);
    }
    if (lower.includes('kemarin lusa') || lower.includes('2 hari lalu')) {
      return this.shiftDate(now, -2);
    }
    const nDaysMatch = lower.match(/(\d+)\s*hari\s*(?:yang\s*)?lalu/);
    if (nDaysMatch) {
      return this.shiftDate(now, -parseInt(nDaysMatch[1], 10));
    }
    // "senin lalu", "jumat kemarin" → most recent past occurrence of that weekday
    const dayMatch = lower.match(
      /\b(minggu|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)\b\s*(lalu|kemarin)?/,
    );
    if (dayMatch && (dayMatch[2] || lower.includes('lalu'))) {
      const target = this.DAY_NAMES[dayMatch[1]];
      const current = now.getDay();
      let diff = current - target;
      if (diff <= 0) diff += 7;
      return this.shiftDate(now, -diff);
    }
    return todayStr;
  }

  private shiftDate(now: Date, days: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return this.toDateStr(d);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // Whole-word-ish match to avoid "air" matching inside "kursi", etc.
  private hasWord(haystack: string, needle: string): boolean {
    if (!needle) return false;
    if (needle.includes(' ')) return haystack.includes(needle);
    const re = new RegExp(`(^|[^a-z0-9])${this.escapeRegex(needle)}([^a-z0-9]|$)`, 'i');
    return re.test(haystack);
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
