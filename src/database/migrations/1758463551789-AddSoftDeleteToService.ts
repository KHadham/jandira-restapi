import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToService1758463551789 implements MigrationInterface {
  name = 'AddSoftDeleteToService1758463551789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service" ADD "deletedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service" DROP COLUMN "deletedAt"`);
  }
}
