import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDebts1784357200000 implements MigrationInterface {
    name = 'AddDebts1784357200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."debts_direction_enum" AS ENUM('owed_to_me', 'i_owe')`);
        await queryRunner.query(`CREATE TABLE "debts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "direction" "public"."debts_direction_enum" NOT NULL, "amount" numeric(15,2) NOT NULL, "counterpartyName" character varying NOT NULL, "notes" text, "dueDate" date, "settledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_debts_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "debts" ADD CONSTRAINT "FK_debts_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "debts" DROP CONSTRAINT "FK_debts_userId"`);
        await queryRunner.query(`DROP TABLE "debts"`);
        await queryRunner.query(`DROP TYPE "public"."debts_direction_enum"`);
    }
}
