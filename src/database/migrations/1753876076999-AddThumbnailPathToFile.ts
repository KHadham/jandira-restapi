import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThumbnailPathToFile1753876076999 implements MigrationInterface {
  name = 'AddThumbnailPathToFile1753876076999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" ADD "thumbnailPath" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN "thumbnailPath"`);
  }
}
