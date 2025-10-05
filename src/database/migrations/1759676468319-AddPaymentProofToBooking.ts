import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentProofToBooking1759676468319
  implements MigrationInterface
{
  name = 'AddPaymentProofToBooking1759676468319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking" ADD "paymentProofId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "UQ_99f10071939a3f7c3c3dc7986ef" UNIQUE ("paymentProofId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_99f10071939a3f7c3c3dc7986ef" FOREIGN KEY ("paymentProofId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_99f10071939a3f7c3c3dc7986ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "UQ_99f10071939a3f7c3c3dc7986ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP COLUMN "paymentProofId"`,
    );
  }
}
