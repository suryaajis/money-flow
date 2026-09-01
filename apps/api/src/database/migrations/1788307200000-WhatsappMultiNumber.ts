import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappMultiNumber1788307200000 implements MigrationInterface {
  name = 'WhatsappMultiNumber1788307200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wa_phone_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "phone" character varying(20) NOT NULL,
        "label" character varying(30) NOT NULL DEFAULT 'WhatsApp',
        "isPrimary" boolean NOT NULL DEFAULT false,
        "notificationsEnabled" boolean NOT NULL DEFAULT false,
        "linkedAt" TIMESTAMP NOT NULL,
        "lastInboundAt" TIMESTAMP,
        "revokedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wa_phone_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wa_phone_links_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wa_phone_links_user_active" ON "wa_phone_links" ("userId", "revokedAt")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_wa_phone_links_active_phone" ON "wa_phone_links" ("phone") WHERE "revokedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_wa_phone_links_active_primary" ON "wa_phone_links" ("userId") WHERE "isPrimary" = true AND "revokedAt" IS NULL`,
    );
    await queryRunner.query(`
      INSERT INTO "wa_phone_links"
        ("userId", "phone", "label", "isPrimary", "notificationsEnabled", "linkedAt")
      SELECT "id", "waPhone", 'Utama', true, true, COALESCE("waLinkedAt", now())
      FROM "users"
      WHERE "waPhone" IS NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "wa_link_challenges" ADD "label" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "recordedByWaPhoneId" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_recordedByWaPhone"
      FOREIGN KEY ("recordedByWaPhoneId") REFERENCES "wa_phone_links"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "UQ_wa_notification_user_date_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD "waPhoneLinkId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD "destinationKey" character varying(64) NOT NULL DEFAULT 'primary'`,
    );
    await queryRunner.query(`
      ALTER TABLE "wa_notification_deliveries"
      ADD CONSTRAINT "FK_wa_notification_phone_link"
      FOREIGN KEY ("waPhoneLinkId") REFERENCES "wa_phone_links"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD CONSTRAINT "UQ_wa_notification_destination_date_kind" UNIQUE ("userId", "deliveryDate", "kind", "destinationKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "UQ_wa_notification_destination_date_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "FK_wa_notification_phone_link"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP COLUMN "destinationKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP COLUMN "waPhoneLinkId"`,
    );
    await queryRunner.query(`
      DELETE FROM "wa_notification_deliveries" newer
      USING "wa_notification_deliveries" older
      WHERE newer."userId" = older."userId"
        AND newer."deliveryDate" = older."deliveryDate"
        AND newer."kind" = older."kind"
        AND (
          newer."createdAt" > older."createdAt"
          OR (newer."createdAt" = older."createdAt" AND newer."id" > older."id")
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" ADD CONSTRAINT "UQ_wa_notification_user_date_kind" UNIQUE ("userId", "deliveryDate", "kind")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_recordedByWaPhone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "recordedByWaPhoneId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wa_link_challenges" DROP COLUMN "label"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_wa_phone_links_active_primary"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_wa_phone_links_active_phone"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_wa_phone_links_user_active"`,
    );
    await queryRunner.query(`DROP TABLE "wa_phone_links"`);
  }
}
