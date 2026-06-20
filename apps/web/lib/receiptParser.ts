import { todayISO } from "@/lib/utils";

/**
 * Receipt OCR output parser.
 *
 * Turns the raw text dump from Tesseract into a structured suggestion the
 * import page can pre-fill its form with. The user always reviews before
 * saving, so the bar here is "good enough most of the time" — we never throw,
 * never block, and always return a usable shape.
 *
 * Designed for Indonesian receipts (GoPay, OVO, DANA, BCA Mobile, Mandiri,
 * Alfamart / Indomaret) plus generic English fallbacks.
 */

export interface ParsedReceipt {
  /** Extracted amount in raw units (e.g. 250000 for Rp 250.000). Null if not found. */
  amount: number | null;
  /** ISO YYYY-MM-DD. Defaults to today's date when not detected. */
  date: string;
  /** Best guess at the merchant / payee name. May be empty string. */
  merchant: string;
  /** The original OCR text — useful for the user to verify low-confidence extractions. */
  rawText: string;
  /** 0..1 score reflecting how many high-signal fields we recovered. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

// Indonesian and English keywords that typically prefix the receipt total.
const TOTAL_KEYWORDS = [
  "total",
  "grand total",
  "subtotal",
  "amount",
  "amount paid",
  "amount due",
  "jumlah",
  "jumlah bayar",
  "total bayar",
  "total pembayaran",
  "total belanja",
  "total tagihan",
  "nominal",
  "dibayar",
  "pembayaran",
  "bayar",
];

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2, pebruari: 2,
  maret: 3, mar: 3, mrt: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agt: 8, agu: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12, december: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7,
};

// Lines that are clearly not merchant names (addresses, phone, dates, totals).
const MERCHANT_BLACKLIST = [
  /^(jl\.?|jalan|alamat|street|address)\b/i,
  /^(telp|telepon|phone|tel|hp|fax)\b/i,
  /^(no\.?|nomor|invoice|struk|receipt|ref|trx|transaksi)\b/i,
  /^(tgl|tanggal|date|waktu|time|jam)\b/i,
  /^(kasir|cashier|operator|staff|pelayan)\b/i,
  /^(npwp|pkp)\b/i,
  /^[\d\s./:\-]+$/, // line is just numbers/punctuation
  /^total\b/i,
  /^subtotal\b/i,
  /^jumlah\b/i,
];

// Tokens that indicate the line is a known Indonesian e-wallet / bank, which
// we want to *prefer* as merchant when present near the top.
const BRAND_HINTS = /\b(gopay|gojek|ovo|dana|shopeepay|linkaja|bca|bri|bni|mandiri|cimb|jenius|alfamart|indomaret|alfamidi|grab|tokopedia|shopee|tiktokshop|tix\.id)\b/i;

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

/**
 * Parse a raw numeric token into a number, handling both Indonesian
 * thousand-separator dots (250.000 = two hundred fifty thousand) and
 * decimal commas / dots.
 *
 * Strategy:
 * - Strip currency markers and whitespace.
 * - If the token contains both `.` and `,`, the last separator is the decimal
 *   one (typical: `1,250.50` US or `1.250,50` ID).
 * - If only one separator type, use heuristics: when there are 3 digits after
 *   it and no other separators, it's a thousands separator.
 */
function parseAmountToken(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d.,]/g, "")
    .replace(/^[.,]+/, "")
    .replace(/[.,]+$/, "");
  if (!cleaned) return null;

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    // The right-most separator wins as the decimal point.
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastComma > lastDot) {
      // Indonesian style: 1.250.000,50
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US style: 1,250,000.50
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Could be thousands (`1,250` US) or decimal (`12,50` ID). 3-digit groups
    // separated by commas across the string -> thousands separator.
    const parts = cleaned.split(",");
    const looksThousands =
      parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    normalized = looksThousands
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    const looksThousands =
      parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    normalized = looksThousands ? cleaned.replace(/\./g, "") : cleaned;
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

interface AmountCandidate {
  value: number;
  /** Higher = more likely to be the real total. */
  score: number;
  lineIndex: number;
}

/** Walk the OCR lines and collect plausible amount candidates with scores. */
function collectAmountCandidates(lines: string[]): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  // Match numeric runs with separators. Tesseract sometimes drops the leading
  // currency symbol so we don't anchor on `Rp` alone.
  const numberRe = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip clearly-not-amount lines (phone numbers, NPWP ids, dates).
    if (/\bnpwp\b/.test(lower)) continue;
    if (/^\s*(?:tgl|tanggal|date)\b/.test(lower)) continue;
    if (/^\s*(?:no\.?|nomor|invoice|struk|ref|trx)\b/.test(lower)) continue;
    if (/^\s*(?:hp|telp|tel|phone|fax)\b/.test(lower)) continue;

    const matches = line.match(numberRe);
    if (!matches) continue;

    // Boost lines that mention a "total" keyword.
    const keywordHit = TOTAL_KEYWORDS.find((kw) => lower.includes(kw));
    const hasCurrency = /\b(rp|idr|usd|\$)/i.test(line);
    const hasGrand = /\b(grand\s*total|total\s*bayar|total\s*pembayaran|total\s*belanja|total\s*tagihan|jumlah\s*bayar)\b/i.test(line);

    for (const raw of matches) {
      const value = parseAmountToken(raw);
      if (value === null) continue;
      // Tiny values (<100) are usually item counts or change references.
      if (value < 100 && !hasCurrency) continue;

      let score = 0;
      if (keywordHit) score += 5;
      if (hasGrand) score += 4;
      if (hasCurrency) score += 2;
      // Lines later in the receipt are more likely to be the total.
      score += i / Math.max(lines.length, 1);
      // Bigger values weakly preferred — totals tend to be the largest line.
      score += Math.log10(value) * 0.5;

      candidates.push({ value, score, lineIndex: i });
    }
  }

  return candidates;
}

function pickAmount(lines: string[]): { amount: number | null; confident: boolean } {
  const candidates = collectAmountCandidates(lines);
  if (candidates.length === 0) return { amount: null, confident: false };

  // Sort by score desc, then by value desc as a tiebreaker (totals are
  // usually the largest number on the receipt).
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  const winner = candidates[0];

  // We're "confident" if the top candidate had keyword evidence (score >= 4)
  // and clearly stands out from the runner-up.
  const runnerUp = candidates[1];
  const confident =
    winner.score >= 4 ||
    (runnerUp ? winner.value >= runnerUp.value * 1.5 : true);

  return { amount: winner.value, confident };
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function toIsoDate(year: number, month: number, day: number): string | null {
  // Sanity-clamp two-digit years (`24` -> `2024`).
  if (year < 100) year += year < 70 ? 2000 : 1900;
  if (year < 1990 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null; // e.g. Feb 30 — invalid
  }
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(text: string): { date: string; found: boolean } {
  // 1. ISO-like: 2026-04-15 or 2026/4/15
  const isoRe = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/;
  const isoMatch = text.match(isoRe);
  if (isoMatch) {
    const iso = toIsoDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
    if (iso) return { date: iso, found: true };
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY (Indonesian default ordering)
  const dmyRe = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/;
  const dmyMatch = text.match(dmyRe);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    // Disambiguate: if first part > 12, it has to be DD/MM/YYYY (US style is
    // M/D/Y, but receipts in ID/EU are D/M/Y — default to D/M/Y).
    const iso = toIsoDate(year, month, day);
    if (iso) return { date: iso, found: true };
    // Fall back to MM/DD/YYYY interpretation.
    const isoUs = toIsoDate(year, day, month);
    if (isoUs) return { date: isoUs, found: true };
  }

  // 3. "15 April 2026", "15 Apr 2026", "April 15, 2026"
  const monthNames = Object.keys(INDONESIAN_MONTHS).join("|");
  const dmonyRe = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{2,4})\\b`,
    "i",
  );
  const monydRe = new RegExp(
    `\\b(${monthNames})\\s+(\\d{1,2}),?\\s+(\\d{2,4})\\b`,
    "i",
  );
  const dmony = text.match(dmonyRe);
  if (dmony) {
    const day = Number(dmony[1]);
    const month = INDONESIAN_MONTHS[dmony[2].toLowerCase()];
    const year = Number(dmony[3]);
    const iso = toIsoDate(year, month, day);
    if (iso) return { date: iso, found: true };
  }
  const mony = text.match(monydRe);
  if (mony) {
    const month = INDONESIAN_MONTHS[mony[1].toLowerCase()];
    const day = Number(mony[2]);
    const year = Number(mony[3]);
    const iso = toIsoDate(year, day, month);
    if (iso) return { date: iso, found: true };
  }

  return { date: todayISO(), found: false };
}

// ---------------------------------------------------------------------------
// Merchant parsing
// ---------------------------------------------------------------------------

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    // Keep common acronyms uppercase.
    .replace(/\b(Bca|Bri|Bni|Cimb|Ovo|Dana|Pt|Cv|Atm|Pln|Pdam)\b/g, (m) =>
      m.toUpperCase(),
    );
}

function pickMerchant(lines: string[]): { merchant: string; found: boolean } {
  // Prefer a brand hit anywhere in the top 8 lines — handles e-wallet
  // confirmation screens where the brand is the first heading.
  const top = lines.slice(0, 8);
  for (const line of top) {
    if (BRAND_HINTS.test(line)) {
      const m = line.match(BRAND_HINTS);
      if (m) return { merchant: titleCase(m[0]), found: true };
    }
  }

  // Fall back to first non-empty line that doesn't look like metadata.
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (trimmed.length < 2) continue;
    if (MERCHANT_BLACKLIST.some((re) => re.test(trimmed))) continue;
    if (trimmed.length > 60) continue; // likely a description, not a name
    return { merchant: titleCase(trimmed), found: true };
  }

  return { merchant: "", found: false };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseReceipt(ocrText: string): ParsedReceipt {
  const rawText = ocrText ?? "";
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const { amount, confident: amountConfident } = pickAmount(lines);
  const { date, found: dateFound } = parseDate(rawText);
  const { merchant, found: merchantFound } = pickMerchant(lines);

  // Confidence: weighted blend of "did we get an amount, a date, a name?"
  // Amount is the most important field — weight it heavily.
  let confidence = 0;
  if (amount !== null) confidence += amountConfident ? 0.55 : 0.3;
  if (dateFound) confidence += 0.2;
  if (merchantFound) confidence += 0.15;
  if (lines.length >= 5) confidence += 0.1; // OCR produced a substantive read
  confidence = clamp(confidence, 0, 1);

  return {
    amount,
    date,
    merchant,
    rawText,
    confidence: Math.round(confidence * 100) / 100,
  };
}
