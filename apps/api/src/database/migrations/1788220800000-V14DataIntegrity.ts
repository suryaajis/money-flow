import { MigrationInterface, QueryRunner } from 'typeorm';

export class V14DataIntegrity1788220800000 implements MigrationInterface {
  name = 'V14DataIntegrity1788220800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "UQ_wa_notification_user_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD CONSTRAINT "UQ_wa_notification_user_date_kind" UNIQUE ("userId", "deliveryDate", "kind")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "categoryId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "clientMutationId" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_transactions_user_client_mutation" ON "transactions" ("userId", "clientMutationId") WHERE "clientMutationId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "notifyDailyInput" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "dailyInputTime" character varying(5) NOT NULL DEFAULT '20:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "webPushReminderEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "webPushReminderTime" character varying(5) NOT NULL DEFAULT '20:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "webPushReminderDays" text NOT NULL DEFAULT '0,1,2,3,4,5,6'`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_members" ADD "inviteTokenHash" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_members" ADD CONSTRAINT "UQ_wallet_members_inviteTokenHash" UNIQUE ("inviteTokenHash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_members" ADD "inviteExpiresAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TABLE "web_push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" text NOT NULL, "auth" text NOT NULL, "lastNotifiedOn" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_web_push_user_endpoint" UNIQUE ("userId", "endpoint"), CONSTRAINT "PK_web_push_subscriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "FK_web_push_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "UQ_wa_notification_user_date_kind"`,
    );
    await queryRunner.query(
      `DELETE FROM "wa_notification_deliveries" a USING "wa_notification_deliveries" b WHERE a."userId" = b."userId" AND a."deliveryDate" = b."deliveryDate" AND a."createdAt" < b."createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD CONSTRAINT "UQ_wa_notification_user_date" UNIQUE ("userId", "deliveryDate")`,
    );
    await queryRunner.query(
      `ALTER TABLE "web_push_subscriptions" DROP CONSTRAINT "FK_web_push_user"`,
    );
    await queryRunner.query(`DROP TABLE "web_push_subscriptions"`);
    await queryRunner.query(
      `ALTER TABLE "wallet_members" DROP COLUMN "inviteExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_members" DROP CONSTRAINT "UQ_wallet_members_inviteTokenHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_members" DROP COLUMN "inviteTokenHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "webPushReminderDays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "webPushReminderTime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "webPushReminderEnabled"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dailyInputTime"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "notifyDailyInput"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transactions_user_client_mutation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "clientMutationId"`,
    );
    await queryRunner.query(
      `UPDATE "transactions" SET "categoryId" = (SELECT "id" FROM "categories" WHERE "categories"."userId" = "transactions"."userId" AND "categories"."name" = 'Lainnya' LIMIT 1) WHERE "categoryId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "categoryId" SET NOT NULL`,
    );
  }
}
