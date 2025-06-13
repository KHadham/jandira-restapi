import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../entities/file.entity';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { FileRepository } from '../../file.repository';

import { FileMapper } from '../mappers/file.mapper';
import { FileType } from '../../../../domain/file';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class FileRelationalRepository implements FileRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async create(data: FileType): Promise<FileType> {
    const persistenceModel = FileMapper.toPersistence(data);
    return this.fileRepository.save(
      this.fileRepository.create(persistenceModel),
    );
  }

  async findById(id: FileType['id']): Promise<NullableType<FileType>> {
    const entity = await this.fileRepository.findOne({
      where: {
        id: id,
      },
    });

    return entity ? FileMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FileType['id'][]): Promise<FileType[]> {
    const entities = await this.fileRepository.find({
      where: {
        id: In(ids),
      },
    });

    return entities.map((entity) => FileMapper.toDomain(entity));
  }

  async findManyByOwnerIdWithPagination({
    ownerId,
    paginationOptions,
    publicOnly, // <--- Receive the new parameter
  }: {
    ownerId: number;
    paginationOptions: IPaginationOptions;
    publicOnly: boolean;
  }): Promise<[FileType[], number]> {
    // Dynamically build the where clause
    const where: FindOptionsWhere<FileEntity> = {
      ownerId: ownerId,
    };

    if (publicOnly) {
      where.isPublic = true; // Add this condition only if needed
    }

    const [entities, total] = await this.fileRepository.findAndCount({
      where: where, // Use the dynamic where clause
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return [entities.map((entity) => FileMapper.toDomain(entity)), total];
  }

  async remove(id: FileType['id']): Promise<void> {
    await this.fileRepository.delete(id);
  }
}
