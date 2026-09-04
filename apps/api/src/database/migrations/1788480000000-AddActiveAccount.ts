import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveAccount1788480000000 implements MigrationInterface {
  name = 'AddActiveAccount1788480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "activeAccountId" uuid`);
    await queryRunner.query(`
      UPDATE "users" user_row
      SET "activeAccountId" = account."id"
      FROM "accounts" account
      WHERE account."ownerUserId" = user_row."id"
        AND account."isDefault" = true
        AND user_row."activeAccountId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_activeAccount"
      FOREIGN KEY ("activeAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_activeAccount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "activeAccountId"`,
    );
  }
}
