import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletMembers1784357300000 implements MigrationInterface {
    name = 'AddWalletMembers1784357300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerUserId" uuid NOT NULL, "memberUserId" uuid, "memberEmail" character varying, "memberWaPhone" character varying(20), "inviteToken" character varying(64), "acceptedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wallet_members_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "wallet_members" ADD CONSTRAINT "FK_wallet_members_ownerUserId" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_members" ADD CONSTRAINT "FK_wallet_members_memberUserId" FOREIGN KEY ("memberUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_members" DROP CONSTRAINT "FK_wallet_members_memberUserId"`);
        await queryRunner.query(`ALTER TABLE "wallet_members" DROP CONSTRAINT "FK_wallet_members_ownerUserId"`);
        await queryRunner.query(`DROP TABLE "wallet_members"`);
    }
}
