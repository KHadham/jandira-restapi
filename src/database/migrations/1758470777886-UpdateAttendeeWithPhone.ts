import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAttendeeWithPhone1758470777886
  implements MigrationInterface
{
  name = 'UpdateAttendeeWithPhone1758470777886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendee" ADD "phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendee" ALTER COLUMN "email" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendee" ALTER COLUMN "email" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "attendee" DROP COLUMN "phone"`);
  }
}
