import type { DataSourceOptions } from 'typeorm';
import { join } from 'node:path';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { RecurringTransaction } from '../recurring/recurring-transaction.entity';
import { WalletMember } from '../shared-wallet/wallet-member.entity';
import { Debt } from '../debts/debt.entity';
import { WaSession } from '../whatsapp/wa-session.entity';
import { WaLinkChallenge } from '../whatsapp/wa-link-challenge.entity';
import { WaWebhookEvent } from '../whatsapp/wa-webhook-event.entity';
import { WaOutboundMessage } from '../whatsapp/wa-outbound-message.entity';
import { WaNotificationDelivery } from '../whatsapp/wa-notification-delivery.entity';
import { WebPushSubscription } from '../push/web-push-subscription.entity';
import { WaPhoneLink } from '../whatsapp/wa-phone-link.entity';
import { Account } from '../accounts/account.entity';
import { AccountShare } from '../accounts/account-share.entity';
import { Transfer } from '../transfers/transfer.entity';
import { SmartRule } from '../smart-rules/smart-rule.entity';
import { RuleExecutionBatch } from '../smart-rules/rule-execution-batch.entity';
import { FinancialHealthSnapshot } from '../financial-health/financial-health-snapshot.entity';
import { RuleCorrectionEvent } from '../smart-rules/rule-correction-event.entity';

export const entities = [
  User,
  Category,
  Transaction,
  Budget,
  PasswordResetToken,
  RecurringTransaction,
  WalletMember,
  Debt,
  WaSession,
  WaLinkChallenge,
  WaWebhookEvent,
  WaOutboundMessage,
  WaNotificationDelivery,
  WebPushSubscription,
  WaPhoneLink,
  Account,
  AccountShare,
  Transfer,
  SmartRule,
  RuleExecutionBatch,
  RuleCorrectionEvent,
  FinancialHealthSnapshot,
];

/**
 * Single source of truth for the database connection. Used by the Nest module
 * at runtime and by the TypeORM CLI (see data-source.ts) for migrations.
 *
 * `env` is the raw environment: ConfigService at runtime, process.env in CLI
 * scripts that run outside the Nest container.
 */
export function buildDataSourceOptions(env: {
  get(key: string): string | undefined;
}): DataSourceOptions {
  // TypeORM's glob loader expects forward slashes, including on Windows.
  // A mixed path such as `D:\\repo\\database/migrations/*` silently loads no
  // migrations and makes the CLI report "No pending migrations".
  const migrationsGlob = join(__dirname, 'migrations', '*.{ts,js}').replace(
    /\\/g,
    '/',
  );

  return {
    type: 'postgres',
    host: env.get('DB_HOST') ?? 'localhost',
    port: Number(env.get('DB_PORT') ?? 5432),
    username: env.get('DB_USERNAME') ?? 'postgres',
    password: env.get('DB_PASSWORD'),
    database: env.get('DB_NAME') ?? 'money_flow',
    entities,
    migrations: [migrationsGlob],
    // Schema changes go through migrations in every environment. Never flip
    // this on: it silently drops columns to match the entities.
    synchronize: false,
    logging: env.get('NODE_ENV') === 'development',
  };
}
