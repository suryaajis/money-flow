import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsapp1784357400000 implements MigrationInterface {
    name = 'AddWhatsapp1784357400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // New columns on existing tables
        await queryRunner.query(`ALTER TABLE "users" ADD "waPhone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_waPhone" UNIQUE ("waPhone")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "waLinkedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "source" character varying(20) DEFAULT 'web'`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "recordedBy" uuid`);

        // Conversation-state table for the WhatsApp bot
        await queryRunner.query(`CREATE TABLE "wa_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "waPhone" character varying(20) NOT NULL, "state" character varying(50) NOT NULL DEFAULT 'idle', "context" jsonb, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wa_sessions_id" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "wa_sessions"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "recordedBy"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "waLinkedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_waPhone"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "waPhone"`);
    }
}
