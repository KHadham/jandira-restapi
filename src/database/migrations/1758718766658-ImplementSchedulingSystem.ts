import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImplementSchedulingSystem1758718766658
  implements MigrationInterface
{
  name = 'ImplementSchedulingSystem1758718766658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" RENAME COLUMN "bookingDate" TO "scheduleId"`,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "capacity" integer NOT NULL, "bookedCount" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "serviceId" uuid, CONSTRAINT "PK_1c05e42aec7371641193e180046" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "service" ADD "isBookable" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "scheduleId"`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "scheduleId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "schedule" ADD CONSTRAINT "FK_69e3d56034fdd8618e2133a1aab" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_2427b072768ad4b322d58a952d2" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_2427b072768ad4b322d58a952d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" DROP CONSTRAINT "FK_69e3d56034fdd8618e2133a1aab"`,
    );
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "scheduleId"`);
    await queryRunner.query(
      `ALTER TABLE "booking" ADD "scheduleId" date NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "service" DROP COLUMN "isBookable"`);
    await queryRunner.query(`DROP TABLE "schedule"`);
    await queryRunner.query(
      `ALTER TABLE "booking" RENAME COLUMN "scheduleId" TO "bookingDate"`,
    );
  }
}
