import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendeeTable1758468976443 implements MigrationInterface {
  name = 'AddAttendeeTable1758468976443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attendee" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "bookingId" uuid, "userId" uuid, CONSTRAINT "PK_070338c19378315cb793abac656" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP COLUMN "numberOfAttendees"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendee" ADD CONSTRAINT "FK_c69d822a38023aeb63ae6120886" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendee" ADD CONSTRAINT "FK_a53717c5719b2eb8910e32a0853" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendee" DROP CONSTRAINT "FK_a53717c5719b2eb8910e32a0853"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendee" DROP CONSTRAINT "FK_c69d822a38023aeb63ae6120886"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD "numberOfAttendees" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(`DROP TABLE "attendee"`);
  }
}
