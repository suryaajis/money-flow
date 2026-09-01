/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Category } from '../categories/category.entity';
import {
  TemplateParserService,
  ParseResult,
  ParsedTransaction,
} from './template-parser.service';

export type { ParseResult, ParsedTransaction };

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private genAI: any = null;
  private readonly anthropicKey: string;
  private readonly provider: 'claude' | 'gemini' | 'auto';

  // When Gemini reports it is out of quota / rate-limited, skip it until this
  // timestamp so we don't burn requests and every message is answered instantly
  // by the template parser. Reset automatically once the cooldown elapses.
  private geminiCooldownUntil = 0;
  private static readonly COOLDOWN_MS = 60 * 1000; // 1 minute default backoff

  constructor(
    private config: ConfigService,
    private readonly templateParser: TemplateParserService,
  ) {
    this.anthropicKey = config.get<string>('ANTHROPIC_API_KEY', '').trim();
    const configured = config.get<string>('AI_PROVIDER', 'auto').toLowerCase();
    this.provider =
      configured === 'claude' || configured === 'gemini' ? configured : 'auto';
    const apiKey = config.get<string>('GEMINI_API_KEY', '');
    if (apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        this.genAI = new GoogleGenerativeAI(apiKey);
      } catch {
        this.logger.warn(
          'Failed to load @google/generative-ai — using template parser only',
        );
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not set — using template parser only');
    }
  }

  async parse(
    text: string,
    categories: Category[],
    now: Date,
  ): Promise<ParseResult> {
    if (
      (this.provider === 'claude' || this.provider === 'auto') &&
      this.anthropicKey
    ) {
      try {
        const result = await this.parseWithClaude(text, categories, now);
        if (result.transactions.length) return this.normalize(result);
      } catch (error) {
        this.logger.warn(
          `Claude parse failed, using next provider: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    if (
      (this.provider === 'gemini' || this.provider === 'auto') &&
      this.canUseGemini()
    ) {
      try {
        const result = await this.parseWithGemini(text, categories, now);
        // Guard against Gemini returning an empty/garbage result — fall back.
        if (result?.transactions?.length) return this.normalize(result);
        this.logger.debug(
          'Gemini returned no transactions, using template parser',
        );
      } catch (err) {
        this.handleGeminiError(err);
      }
    }
    // Non-AI fallback: always available, no rate limit.
    return this.templateParser.parse(text, categories, now);
  }

  private normalize(result: ParseResult): ParseResult {
    return {
      transactions: result.transactions
        .filter(
          (tx) =>
            Number(tx.amount) > 0 && ['income', 'expense'].includes(tx.type),
        )
        .map((tx) => ({
          ...tx,
          categoryId: tx.categoryId ?? null,
          notes: tx.notes ?? null,
          confidence: Math.max(0, Math.min(1, Number(tx.confidence ?? 0.7))),
          ambiguousFields: Array.isArray(tx.ambiguousFields)
            ? tx.ambiguousFields
            : [],
        })),
    };
  }

  private async parseWithClaude(
    text: string,
    categories: Category[],
    now: Date,
  ): Promise<ParseResult> {
    const prompt = this.buildPrompt(text, categories, now);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.get<string>(
          'ANTHROPIC_MODEL',
          'claude-3-5-haiku-latest',
        ),
        max_tokens: 1200,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
    const body = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const raw = body.content?.find((item) => item.type === 'text')?.text ?? '';
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('Claude response did not contain JSON');
    return JSON.parse(json) as ParseResult;
  }

  private buildPrompt(text: string, categories: Category[], now: Date): string {
    const today = now.toISOString().split('T')[0];
    const cats = categories
      .map((c) => `${c.id}:${c.name}(${c.type})`)
      .join(', ');
    return `Parse Indonesian finance message into strict JSON only. Message: ${JSON.stringify(text)}. Today: ${today}. Categories: ${cats}. Return {"transactions":[{"amount":15000,"type":"expense","categoryId":"uuid-or-null","date":"${today}","notes":"kopi","confidence":0.95,"ambiguousFields":[]}]}. confidence is 0..1 and ambiguousFields may contain amount,type,categoryId,date.`;
  }

  private canUseGemini(): boolean {
    if (!this.genAI) return false;
    if (Date.now() < this.geminiCooldownUntil) return false;
    return true;
  }

  private handleGeminiError(err: any): void {
    const status = err?.status ?? err?.response?.status;
    const message = String(err?.message ?? '').toLowerCase();
    const isQuota =
      status === 429 ||
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('resource has been exhausted') ||
      message.includes('exceeded');

    if (isQuota) {
      this.geminiCooldownUntil = Date.now() + MessageParserService.COOLDOWN_MS;
      this.logger.warn(
        `Gemini quota/rate limit hit — switching to template parser for ${
          MessageParserService.COOLDOWN_MS / 1000
        }s`,
      );
    } else {
      this.logger.warn(
        `Gemini parse failed (${status ?? 'unknown'}), using template parser`,
      );
    }
  }

  private async parseWithGemini(
    text: string,
    categories: Category[],
    now: Date,
  ): Promise<ParseResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const todayStr = now.toISOString().split('T')[0];
    const catList = categories
      .map((c) => `${c.id}:${c.name}(${c.type})`)
      .join(', ');

    const prompt = `Parse pesan keuangan dalam Bahasa Indonesia berikut menjadi JSON transaksi.

Pesan: "${text}"
Tanggal hari ini: ${todayStr}
Kategori tersedia (id:nama:tipe): ${catList}

Aturan parsing:
- "rb/ribu/k" = × 1.000, "jt/juta" = × 1.000.000, "M/miliar" = × 1.000.000.000
- Awalan "+" atau kata (gajian, terima, dapat, masuk, bayaran) = income; sisanya = expense
- Pilih categoryId yang paling sesuai dari daftar; null jika tidak yakin
- "kemarin" = hari sebelumnya, "tadi" / "pagi ini" = hari ini
- Satu pesan bisa berisi beberapa transaksi (dipisah koma/titik koma)

Format output JSON:
{
  "transactions": [
    {
      "amount": 15000,
      "type": "expense",
      "categoryId": "uuid-or-null",
      "date": "${todayStr}",
      "notes": "kopi",
      "confidence": 0.95,
      "ambiguousFields": []
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText) as ParseResult;
  }
}
