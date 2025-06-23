import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressAndIdentityPhotoToUser1750600638569
  implements MigrationInterface
{
  name = 'AddAddressAndIdentityPhotoToUser1750600638569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "address" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD "identityPhotoId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_4e5a2d81043fa5566f6316c818b" UNIQUE ("identityPhotoId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_4e5a2d81043fa5566f6316c818b" FOREIGN KEY ("identityPhotoId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_4e5a2d81043fa5566f6316c818b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_4e5a2d81043fa5566f6316c818b"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "identityPhotoId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "address"`);
  }
}
