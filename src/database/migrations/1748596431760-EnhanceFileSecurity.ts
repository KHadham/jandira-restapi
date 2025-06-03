import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceFileSecurity1748596431760 implements MigrationInterface {
  name = 'EnhanceFileSecurity1748596431760';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."file_driver_enum" AS ENUM('local', 's3', 's3-presigned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD "driver" "public"."file_driver_enum" NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(`ALTER TABLE "file" ADD "ownerId" integer`);
    await queryRunner.query(
      `ALTER TABLE "file" ADD "isPublic" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "file" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(
      `CREATE INDEX "IDX_34c5a7443f6f1ab14d73c5d054" ON "file" ("ownerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "file" ADD CONSTRAINT "FK_34c5a7443f6f1ab14d73c5d0549" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" DROP CONSTRAINT "FK_34c5a7443f6f1ab14d73c5d0549"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_34c5a7443f6f1ab14d73c5d054"`,
    );
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "isPublic"`);
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "ownerId"`);
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "driver"`);
    await queryRunner.query(`DROP TYPE "public"."file_driver_enum"`);
  }
}
