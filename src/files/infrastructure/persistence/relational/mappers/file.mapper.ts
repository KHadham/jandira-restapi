import { FileDriver } from '../../../../config/file-config.type';
import { FileType } from '../../../../domain/file';
import { FileCategoryEnum } from '../../../../domain/file-category.enum';
import { FileEntity } from '../entities/file.entity';

export class FileMapper {
  static toDomain(raw: FileEntity): FileType {
    const file = new FileType();
    file.id = raw.id;
    file.path = raw.path;
    file.thumbnailPath = raw.thumbnailPath; // <--- ADD THIS LINE
    file.driver = raw.driver;
    file.ownerId = raw.ownerId;
    file.isPublic = raw.isPublic;
    file.category = raw.category;
    return file;
  }

  static toPersistence(domainEntity: FileType): FileEntity {
    const file = new FileEntity();
    file.id = domainEntity.id;
    file.path = domainEntity.path;
    file.thumbnailPath = domainEntity.thumbnailPath; // <--- ADD THIS LINE
    file.driver = domainEntity.driver as FileDriver;
    file.ownerId = domainEntity.ownerId as number;
    file.isPublic = domainEntity.isPublic;
    file.category = domainEntity.category ?? FileCategoryEnum.GENERAL;
    return file;
  }
}
