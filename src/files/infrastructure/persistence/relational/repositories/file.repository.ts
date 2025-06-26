import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../entities/file.entity';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { FileRepository } from '../../file.repository';

import { FileMapper } from '../mappers/file.mapper';
import { FileType } from '../../../../domain/file';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FilterFileDto, SortFileDto } from '../../../../dto/query-file.dto';

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

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterFileDto | null;
    sortOptions?: SortFileDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<[FileType[], number]> {
    const queryBuilder = this.fileRepository.createQueryBuilder('file');
    queryBuilder.leftJoinAndSelect('file.owner', 'owner'); // Join with owner for potential filtering

    if (filterOptions?.ownerId) {
      queryBuilder.andWhere('file.ownerId = :ownerId', {
        ownerId: filterOptions.ownerId,
      });
    }

    if (filterOptions?.category) {
      queryBuilder.andWhere('file.category = :category', {
        category: filterOptions.category,
      });
    }

    if (sortOptions?.length) {
      sortOptions.forEach((sort) => {
        queryBuilder.addOrderBy(
          `file.${sort.orderBy}`,
          sort.order.toUpperCase() as 'ASC' | 'DESC',
        );
      });
    } else {
      queryBuilder.orderBy('file.createdAt', 'DESC'); // Default sort
    }

    const [entities, total] = await queryBuilder
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit)
      .getManyAndCount();

    return [entities.map(FileMapper.toDomain), total];
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
