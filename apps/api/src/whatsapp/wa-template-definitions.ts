export interface WaTemplateDefinition {
  envKey: string;
  defaultName: string;
  language: string;
  category: 'UTILITY';
  body: string;
  examples: string[];
}

export const WA_TEMPLATE_DEFAULT_NAMES = {
  monthlyRecap: 'moneyflow_monthly_recap',
  overBudget: 'moneyflow_budget_alert',
  debtDue: 'moneyflow_debt_due',
  sharedWallet: 'moneyflow_shared_wallet_activity',
  dailyInput: 'moneyflow_daily_input_reminder',
  sharedInvite: 'moneyflow_shared_wallet_invite',
} as const;

export const WA_TEMPLATE_DEFINITIONS: readonly WaTemplateDefinition[] = [
  {
    envKey: 'WA_TEMPLATE_DAILY_INPUT',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.dailyInput,
    language: 'id',
    category: 'UTILITY',
    body: 'Belum ada transaksi MoneyFlow hari ini. Catat sekarang agar rekapmu tetap lengkap.',
    examples: [],
  },
  {
    envKey: 'WA_TEMPLATE_SHARED_INVITE',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.sharedInvite,
    language: 'id',
    category: 'UTILITY',
    body: '{{1}} mengundangmu ke dompet bersama MoneyFlow. Buka tautan ini sebelum kedaluwarsa: {{2}}.',
    examples: [
      'Surya',
      'https://moneyflow.example/shared-wallet?token=example',
    ],
  },
  {
    envKey: 'WA_TEMPLATE_MONTHLY_RECAP',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.monthlyRecap,
    language: 'id',
    category: 'UTILITY',
    body:
      'Rekap MoneyFlow {{1}} sudah siap.\n\n' +
      'Pemasukan: Rp{{2}}\n' +
      'Pengeluaran: Rp{{3}}\n' +
      'Saldo bersih: Rp{{4}}\n\n' +
      'Top pengeluaran:\n{{5}}\n\n' +
      'Buka MoneyFlow untuk melihat detail.',
    examples: [
      'Juli 2026',
      '8.000.000',
      '3.200.000',
      '4.800.000',
      '1. Makanan: Rp1.200.000 (38%)',
    ],
  },
  {
    envKey: 'WA_TEMPLATE_OVER_BUDGET',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.overBudget,
    language: 'id',
    category: 'UTILITY',
    body:
      'Anggaran MoneyFlow kamu terlampaui:\n\n{{1}}\n\n' +
      'Buka MoneyFlow untuk melihat detail dan menyesuaikan anggaran.',
    examples: ['Makanan: Rp1.250.000 / Rp1.000.000 (125%)'],
  },
  {
    envKey: 'WA_TEMPLATE_DEBT_DUE',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.debtDue,
    language: 'id',
    category: 'UTILITY',
    body:
      'Pengingat utang/piutang MoneyFlow:\n\n{{1}}\n\n' +
      'Buka MoneyFlow untuk memperbarui status pembayaran.',
    examples: ['Kamu harus bayar Rp250.000 ke Budi — jatuh tempo besok'],
  },
  {
    envKey: 'WA_TEMPLATE_SHARED_WALLET',
    defaultName: WA_TEMPLATE_DEFAULT_NAMES.sharedWallet,
    language: 'id',
    category: 'UTILITY',
    body:
      'Aktivitas baru pada dompet bersama MoneyFlow.\n\n' +
      'Dicatat oleh: {{1}}\n' +
      'Nominal: {{2}}\n' +
      'Kategori: {{3}}\n' +
      'Catatan: {{4}}\n\n' +
      'Buka MoneyFlow untuk melihat detail.',
    examples: ['Andi', '-Rp75.000', 'Makanan', 'Makan malam'],
  },
] as const;

export function resolveWaTemplateName(
  definition: WaTemplateDefinition,
): string {
  const name = process.env[definition.envKey]?.trim() || definition.defaultName;
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`${definition.envKey} bukan nama template Meta yang valid`);
  }
  return name;
}

export function buildMetaTemplatePayload(definition: WaTemplateDefinition) {
  const language =
    process.env.WA_TEMPLATE_LANGUAGE?.trim() || definition.language;
  if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) {
    throw new Error('WA_TEMPLATE_LANGUAGE tidak valid');
  }
  return {
    name: resolveWaTemplateName(definition),
    language,
    category: definition.category,
    components: [
      {
        type: 'BODY',
        text: definition.body,
        example: { body_text: [definition.examples] },
      },
    ],
  };
}
