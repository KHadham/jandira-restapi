import { Injectable } from '@nestjs/common';

import { FileRepository } from './infrastructure/persistence/file.repository';
import { FileType } from './domain/file';
import { NullableType } from '../utils/types/nullable.type';
import { User } from '../users/domain/user';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { RoleEnum } from '../roles/roles.enum';

@Injectable()
export class FilesService {
  constructor(private readonly fileRepository: FileRepository) {}

  findById(id: FileType['id']): Promise<NullableType<FileType>> {
    return this.fileRepository.findById(id);
  }

  findByIds(ids: FileType['id'][]): Promise<FileType[]> {
    return this.fileRepository.findByIds(ids);
  }

  findManyByUserId({
    targetUserId,
    requestingUser,
    paginationOptions,
  }: {
    targetUserId: User['id'];
    requestingUser: User;
    paginationOptions: IPaginationOptions;
  }): Promise<[FileType[], number]> {
    // --- REFACTOR START: Enhance permission logic ---

    const isAdmin = requestingUser.role?.id === RoleEnum.admin;
    const isOwner = requestingUser.id === targetUserId;

    // We should only filter for public files if the person making the request
    // is NEITHER the owner of the files NOR an admin.
    const publicOnly = !isOwner && !isAdmin;

    // --- REFACTOR END ---

    return this.fileRepository.findManyByOwnerIdWithPagination({
      ownerId: Number(targetUserId),
      paginationOptions,
      publicOnly: publicOnly,
    });
  }
}
