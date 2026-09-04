import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountFoundationV161788393600000 implements MigrationInterface {
  name = 'AccountFoundationV161788393600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerUserId" uuid NOT NULL,
        "name" character varying(80) NOT NULL,
        "type" character varying(20) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'IDR',
        "openingBalance" numeric(18,2) NOT NULL DEFAULT 0,
        "color" character varying(20),
        "icon" character varying(40),
        "isDefault" boolean NOT NULL DEFAULT false,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "archivedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_owner" FOREIGN KEY ("ownerUserId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_accounts_default_owner" ON "accounts" ("ownerUserId") WHERE "isDefault" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_owner_archived" ON "accounts" ("ownerUserId", "archivedAt")`,
    );
    await queryRunner.query(`
      INSERT INTO "accounts"
        ("ownerUserId", "name", "type", "currency", "openingBalance", "color", "icon", "isDefault", "sortOrder")
      SELECT "id", 'Dompet Utama', 'cash', 'IDR', 0, '#84cc16', 'Wallet', true, 0
      FROM "users"
    `);
    await queryRunner.query(`ALTER TABLE "transactions" ADD "accountId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "recordedByUserId" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" ADD "transferId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "entryRole" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "adjustmentReason" text`,
    );
    await queryRunner.query(`
      UPDATE "transactions" transaction
      SET "accountId" = account."id",
          "recordedByUserId" = COALESCE(transaction."recordedBy", transaction."userId")
      FROM "accounts" account
      WHERE account."ownerUserId" = transaction."userId" AND account."isDefault" = true
    `);
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "accountId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_account"
      FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_recordedByUser"
      FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_account_date" ON "transactions" ("accountId", "date")`,
    );

    await queryRunner.query(
      `ALTER TABLE "recurring_transactions" ADD "accountId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "recurring_transactions" recurring
      SET "accountId" = account."id"
      FROM "accounts" account
      WHERE account."ownerUserId" = recurring."userId" AND account."isDefault" = true
    `);
    await queryRunner.query(
      `ALTER TABLE "recurring_transactions" ALTER COLUMN "accountId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" ADD CONSTRAINT "FK_recurring_account"
      FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE TABLE "account_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "memberUserId" uuid NOT NULL,
        "invitedEmail" character varying(320) NOT NULL,
        "role" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "inviteTokenHash" character varying(64),
        "inviteExpiresAt" TIMESTAMP,
        "acceptedAt" TIMESTAMP,
        "revokedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_account_shares_account_member" UNIQUE ("accountId", "memberUserId"),
        CONSTRAINT "FK_account_shares_account" FOREIGN KEY ("accountId")
          REFERENCES "accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_account_shares_member" FOREIGN KEY ("memberUserId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_account_shares_member_status" ON "account_shares" ("memberUserId", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_account_shares_token" ON "account_shares" ("inviteTokenHash") WHERE "inviteTokenHash" IS NOT NULL`,
    );
    await queryRunner.query(`
      INSERT INTO "account_shares"
        ("accountId", "memberUserId", "invitedEmail", "role", "status", "acceptedAt")
      SELECT account."id", member."memberUserId", LOWER(member."memberEmail"),
             'contributor', 'accepted', member."acceptedAt"
      FROM "wallet_members" member
      JOIN "accounts" account
        ON account."ownerUserId" = member."ownerUserId" AND account."isDefault" = true
      WHERE member."memberUserId" IS NOT NULL AND member."acceptedAt" IS NOT NULL
      ON CONFLICT ("accountId", "memberUserId") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "sourceAccountId" uuid NOT NULL,
        "destinationAccountId" uuid NOT NULL,
        "sourceAmount" numeric(18,2) NOT NULL,
        "destinationAmount" numeric(18,2) NOT NULL,
        "exchangeRate" numeric(18,8) NOT NULL,
        "date" date NOT NULL,
        "notes" text,
        "idempotencyKey" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transfers_source" FOREIGN KEY ("sourceAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transfers_destination" FOREIGN KEY ("destinationAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_transfers_accounts" CHECK ("sourceAccountId" <> "destinationAccountId")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transfers_idempotency" ON "transfers" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_transfer"
      FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "smart_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "conditions" jsonb NOT NULL,
        "actions" jsonb NOT NULL,
        "priority" integer NOT NULL DEFAULT 100,
        "active" boolean NOT NULL DEFAULT true,
        "stopOnMatch" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_smart_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_smart_rules_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_smart_rules_user_priority" ON "smart_rules" ("userId", "priority")`,
    );
    await queryRunner.query(`
      CREATE TABLE "rule_execution_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "ruleId" uuid NOT NULL,
        "beforeSnapshot" jsonb NOT NULL,
        "reversibleUntil" TIMESTAMP NOT NULL,
        "undoneAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rule_execution_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rule_batches_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rule_batches_rule" FOREIGN KEY ("ruleId") REFERENCES "smart_rules"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "smart_rule_correction_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "merchantKey" character varying(160) NOT NULL,
        "sampleDescription" character varying(160) NOT NULL,
        "categoryId" uuid NOT NULL,
        "source" character varying(20),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_smart_rule_correction_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rule_correction_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rule_correction_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_rule_correction_suggestion" ON "smart_rule_correction_events" ("userId", "merchantKey", "categoryId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD "healthScoreEnabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`
      CREATE TABLE "financial_health_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "period" character varying(7) NOT NULL,
        "score" integer,
        "components" jsonb NOT NULL,
        "formulaVersion" character varying(20) NOT NULL,
        "dataQuality" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_financial_health_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_financial_health_period" UNIQUE ("userId", "period", "formulaVersion"),
        CONSTRAINT "FK_financial_health_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "financial_health_snapshots"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "healthScoreEnabled"`,
    );
    await queryRunner.query(`DROP TABLE "rule_execution_batches"`);
    await queryRunner.query(`DROP TABLE "smart_rule_correction_events"`);
    await queryRunner.query(`DROP TABLE "smart_rules"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_transfer"`,
    );
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TABLE "account_shares"`);
    await queryRunner.query(
      `ALTER TABLE "recurring_transactions" DROP CONSTRAINT "FK_recurring_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_transactions" DROP COLUMN "accountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_recordedByUser"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_account"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transactions_account_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "adjustmentReason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "entryRole"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "transferId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "recordedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "accountId"`,
    );
    await queryRunner.query(`DROP TABLE "accounts"`);
  }
}
