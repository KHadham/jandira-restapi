import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingTable1758464983318 implements MigrationInterface {
  name = 'CreateBookingTable1758464983318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status_enum" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingDate" date NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "totalPrice" integer NOT NULL, "numberOfAttendees" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "serviceId" uuid, CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_336b3f4a235460dc93645fbf222" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_e812cafb996fae4e9636ffe294f" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_e812cafb996fae4e9636ffe294f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_336b3f4a235460dc93645fbf222"`,
    );
    await queryRunner.query(`DROP TABLE "booking"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
  }
}
