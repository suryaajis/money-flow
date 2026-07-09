import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  categoryName: string;
  date: string;
  notes: string;
  confidence: number;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  needsClarification: boolean;
  clarificationQuestion?: string;
}

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private genAI: any = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        this.genAI = new GoogleGenerativeAI(apiKey);
      } catch {
        this.logger.warn('Failed to initialize Gemini AI, falling back to rule-based parser');
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not set, using rule-based parser');
    }
  }

  async parse(
    message: string,
    categories: string[],
    today: string,
  ): Promise<ParseResult> {
    if (this.genAI) {
      try {
        return await this.parseWithGemini(message, categories, today);
      } catch (err) {
        this.logger.error('Gemini parse failed, falling back to rule-based', err);
      }
    }
    return this.ruleBasedParse(message, today);
  }

  private async parseWithGemini(
    message: string,
    categories: string[],
    today: string,
  ): Promise<ParseResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const prompt = `You are a financial transaction parser for an Indonesian personal finance app.
Today's date: ${today}

Available categories: ${categories.join(', ')}

Parse the user's message into financial transactions.

Rules:
- Amount formats: 15rb/15k/15ribu = 15000, 1jt/1juta = 1000000, 1.5jt = 1500000
- Income indicators: +, "gajian", "gaji", "terima", "dapat", "masuk", "transfer masuk", "bayaran"
- Expense is default if no income indicator
- Date parsing: "kemarin" = yesterday, "tadi pagi" = today, "2 hari lalu" = 2 days ago, "senin lalu" = last monday
- Auto-classify to closest category from the list
- If multiple transactions in one message, parse all of them
- confidence: 0.0-1.0 (use < 0.7 if amount or category is unclear)

Return JSON only:
{
  "transactions": [
    {
      "amount": number,
      "type": "income" | "expense",
      "categoryName": "string (from available categories or best guess)",
      "date": "YYYY-MM-DD",
      "notes": "string",
      "confidence": number
    }
  ],
  "needsClarification": boolean,
  "clarificationQuestion": "string or null"
}

User message: "${message}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  }

  private ruleBasedParse(message: string, today: string): ParseResult {
    const normalized = message.toLowerCase().trim();

    // Parse amount
    const amountMatch = normalized.match(
      /(\+?)([\d,.]+)\s*(rb|ribu|k|jt|juta|m|miliar)?/,
    );
    if (!amountMatch) {
      return {
        transactions: [],
        needsClarification: true,
        clarificationQuestion: 'Maaf, aku tidak bisa mendeteksi jumlah. Coba format: "kopi 15rb" atau "gajian 5jt"',
      };
    }

    const isIncome =
      normalized.startsWith('+') ||
      /\b(gajian?|terima|dapat|masuk|bayaran|transfer masuk)\b/.test(normalized);

    let amount = parseFloat(amountMatch[2].replace(',', '.').replace('.', ''));
    if (isNaN(amount)) amount = 0;
    const unit = amountMatch[3];
    if (unit === 'rb' || unit === 'ribu' || unit === 'k') amount *= 1000;
    else if (unit === 'jt' || unit === 'juta') amount *= 1_000_000;
    else if (unit === 'm' || unit === 'miliar') amount *= 1_000_000_000;

    // Rule-based category
    let categoryName = 'Lainnya';
    if (/\b(kopi|makan|minum|resto|warung|siang|malam|sarapan)\b/.test(normalized)) categoryName = 'Makanan';
    else if (/\b(bensin|bbm|parkir|tol|ojek|grab|gojek|bus|kereta|transport)\b/.test(normalized)) categoryName = 'Transport';
    else if (/\b(listrik|air|internet|wifi|telpon|pulsa|token)\b/.test(normalized)) categoryName = 'Tagihan';
    else if (/\b(baju|sepatu|celana|belanja|mall|toko)\b/.test(normalized)) categoryName = 'Belanja';
    else if (/\b(gajian?|gaji|salary)\b/.test(normalized)) categoryName = 'Gaji';
    else if (/\b(hiburan|nonton|bioskop|game)\b/.test(normalized)) categoryName = 'Hiburan';
    else if (/\b(kesehatan|obat|dokter|apotik|rumah sakit)\b/.test(normalized)) categoryName = 'Kesehatan';

    // Date
    let date = today;
    if (/kemarin/.test(normalized)) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    }

    const notes = message.replace(/[\d,.]+\s*(rb|ribu|k|jt|juta|m|miliar)?/gi, '').trim();

    return {
      transactions: [
        { amount, type: isIncome ? 'income' : 'expense', categoryName, date, notes, confidence: 0.7 },
      ],
      needsClarification: false,
    };
  }
}
