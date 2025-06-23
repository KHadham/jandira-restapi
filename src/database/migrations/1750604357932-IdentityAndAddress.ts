import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdentityAndAddress1750604357932 implements MigrationInterface {
  name = 'IdentityAndAddress1750604357932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."file_category_enum" AS ENUM('PROFILE_PICTURE', 'IDENTITY_CARD', 'DOCUMENT', 'GENERAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD "category" "public"."file_category_enum" NOT NULL DEFAULT 'GENERAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "public"."file_category_enum"`);
  }
}
