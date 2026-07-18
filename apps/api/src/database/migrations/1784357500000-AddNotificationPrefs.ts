import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPrefs1784357500000 implements MigrationInterface {
    name = 'AddNotificationPrefs1784357500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "notifyMonthlyRecap" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "notifyOverBudget" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "notifyDebtDue" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notifyDebtDue"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notifyOverBudget"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notifyMonthlyRecap"`);
    }
}
