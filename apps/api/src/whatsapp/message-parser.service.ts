import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY', '');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY not set — using rule-based fallback parser');
    }
  }

  async parse(text: string, categories: Category[], now: Date): Promise<ParseResult> {
    if (this.genAI) {
      try {
        return await this.parseWithGemini(text, categories, now);
      } catch (err) {
        this.logger.warn('Gemini parse failed, falling back to rule-based', err.message);
      }
    }
    return this.parseRuleBased(text, categories, now);
  }

  private async parseWithGemini(text: string, categories: Category[], now: Date): Promise<ParseResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const catList = categories.map(c => `${c.id}:${c.name}(${c.type})`).join(', ');
    const todayStr = now.toISOString().split('T')[0];

    const prompt = `Parse pesan keuangan dalam Bahasa Indonesia berikut menjadi JSON transaksi.

Pesan: "${text}"
Tanggal hari ini: ${todayStr}
Kategori tersedia: ${catList}

Aturan parsing:
- "rb/ribu/k" = × 1.000, "jt/juta" = × 1.000.000, "M/miliar" = × 1.000.000.000
- Awalan "+" atau kata (gajian, terima, dapat, masuk) = income; sisanya = expense
- Pilih categoryId yang paling sesuai dari daftar; null jika tidak yakin
- "kemarin" = hari sebelumnya, "tadi" / "pagi ini" = hari ini
- Satu pesan bisa berisi beberapa transaksi

Format output JSON (array selalu):
{
  "transactions": [
    {
      "amount": 15000,
      "type": "expense",
      "categoryId": "cat-food",
      "date": "${todayStr}",
      "notes": "kopi"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed as ParseResult;
  }

  // Fallback rule-based parser
  private parseRuleBased(text: string, categories: Category[], now: Date): ParseResult {
    const todayStr = now.toISOString().split('T')[0];
    const transactions: ParsedTransaction[] = [];

    // Split by comma for multiple transactions
    const parts = text.split(/,|;/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      const tx = this.parseOnePart(part, categories, todayStr);
      if (tx) transactions.push(tx);
    }

    return { transactions };
  }

  private parseOnePart(text: string, categories: Category[], date: string): ParsedTransaction | null {
    const lower = text.toLowerCase();

    // Amount extraction
    const amountMatch = lower.match(/(\d+[.,]?\d*)\s*(rb|ribu|k|jt|juta|m|miliar)?/i);
    if (!amountMatch) return null;

    let amount = parseFloat(amountMatch[1].replace(',', '.'));
    const unit = (amountMatch[2] || '').toLowerCase();
    if (['rb', 'ribu', 'k'].includes(unit)) amount *= 1000;
    else if (['jt', 'juta'].includes(unit)) amount *= 1_000_000;
    else if (['m', 'miliar'].includes(unit)) amount *= 1_000_000_000;

    // Type detection
    const incomeWords = ['gajian', 'gaji', 'terima', 'dapat', 'masuk', 'bayaran', 'fee', 'honor'];
    const type = lower.startsWith('+') || incomeWords.some(w => lower.includes(w)) ? 'income' : 'expense';

    // Category matching by keyword
    const keywordMap: Record<string, string[]> = {
      'Makanan': ['makan', 'kopi', 'nasi', 'soto', 'bakso', 'mie', 'pizza', 'ayam', 'food', 'snack'],
      'Transport': ['bensin', 'grab', 'gojek', 'ojek', 'taxi', 'parkir', 'tol', 'bus', 'kereta'],
      'Belanja': ['beli', 'baju', 'sepatu', 'tokped', 'shopee', 'lazada'],
      'Tagihan': ['listrik', 'air', 'internet', 'wifi', 'bayar', 'cicilan'],
      'Gaji': ['gajian', 'gaji', 'salary'],
      'Hiburan': ['nonton', 'bioskop', 'game', 'netflix', 'spotify'],
      'Kesehatan': ['dokter', 'obat', 'apotek', 'rumah sakit'],
    };

    let categoryId: string | null = null;
    const targetType = type === 'income' ? ['income', 'both'] : ['expense', 'both'];
    const validCats = categories.filter(c => targetType.includes(c.type));

    for (const [catName, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => lower.includes(kw))) {
        const matched = validCats.find(c => c.name.toLowerCase().includes(catName.toLowerCase()));
        if (matched) { categoryId = matched.id; break; }
      }
    }

    // If income and no category, try salary category
    if (type === 'income' && !categoryId) {
      const salaryCat = validCats.find(c => c.name.toLowerCase().includes('gaji') || c.name.toLowerCase().includes('salary'));
      if (salaryCat) categoryId = salaryCat.id;
    }

    // Extract notes (text after removing amount)
    const notes = text.replace(amountMatch[0], '').replace(/^[+\-\s]+/, '').trim() || null;

    return { amount, type, categoryId, date, notes };
  }
}
