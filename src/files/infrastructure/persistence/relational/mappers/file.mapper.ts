import { FileDriver } from '../../../../config/file-config.type';
import { FileType } from '../../../../domain/file';
import { FileCategoryEnum } from '../../../../domain/file-category.enum';
import { FileEntity } from '../entities/file.entity';

export class FileMapper {
  static toDomain(raw: FileEntity): FileType {
    const domainEntity = new FileType();
    domainEntity.id = raw.id;
    domainEntity.path = raw.path;
    domainEntity.driver = raw.driver;
    domainEntity.ownerId = raw.ownerId;
    domainEntity.isPublic = raw.isPublic;
    domainEntity.category = raw.category; // Ensure category is mapped if needed
    return domainEntity;
  }

  static toPersistence(domainEntity: FileType): FileEntity {
    const persistenceEntity = new FileEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.path = domainEntity.path;
    persistenceEntity.driver = domainEntity.driver as FileDriver; // Handle optional driver
    persistenceEntity.ownerId = domainEntity.ownerId as number;
    persistenceEntity.isPublic = domainEntity.isPublic;
    persistenceEntity.category =
      domainEntity.category ?? FileCategoryEnum.GENERAL; // Default to LOCAL if not specified
    return persistenceEntity;
  }
}
