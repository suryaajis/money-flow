import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappProductionHardening1787890000000 implements MigrationInterface {
  name = 'WhatsappProductionHardening1787890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wa_link_challenges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" character(64) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wa_link_challenge_token" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_wa_link_challenges" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wa_link_challenges_user" ON "wa_link_challenges" ("userId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "wa_link_challenges"
      ADD CONSTRAINT "FK_wa_link_challenges_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "wa_webhook_events" (
        "eventKey" character varying(255) NOT NULL,
        "eventType" character varying(50) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'processing',
        "lastError" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wa_webhook_events" PRIMARY KEY ("eventKey")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "wa_outbound_messages" (
        "id" character varying(255) NOT NULL,
        "recipient" character varying(20) NOT NULL,
        "messageType" character varying(20) NOT NULL,
        "templateName" character varying(100),
        "status" character varying(20) NOT NULL DEFAULT 'accepted',
        "errorCode" character varying(50),
        "errorDetails" text,
        "acceptedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wa_outbound_messages" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "wa_notification_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "deliveryDate" date NOT NULL,
        "kind" character varying(50) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "messageId" character varying(255),
        "errorDetails" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wa_notification_user_date" UNIQUE ("userId", "deliveryDate"),
        CONSTRAINT "PK_wa_notification_deliveries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "wa_notification_deliveries"
      ADD CONSTRAINT "FK_wa_notification_deliveries_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wa_notification_deliveries" DROP CONSTRAINT "FK_wa_notification_deliveries_user"`,
    );
    await queryRunner.query(`DROP TABLE "wa_notification_deliveries"`);
    await queryRunner.query(`DROP TABLE "wa_outbound_messages"`);
    await queryRunner.query(`DROP TABLE "wa_webhook_events"`);
    await queryRunner.query(
      `ALTER TABLE "wa_link_challenges" DROP CONSTRAINT "FK_wa_link_challenges_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_wa_link_challenges_user"`,
    );
    await queryRunner.query(`DROP TABLE "wa_link_challenges"`);
  }
}
