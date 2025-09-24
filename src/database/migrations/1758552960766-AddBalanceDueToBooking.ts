import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBalanceDueToBooking1758552960766 implements MigrationInterface {
  name = 'AddBalanceDueToBooking1758552960766';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" ADD "balanceDue" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "balanceDue"`);
  }
}
