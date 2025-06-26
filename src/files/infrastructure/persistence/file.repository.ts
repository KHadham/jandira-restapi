import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FileType } from '../../domain/file';
import { FilterFileDto, SortFileDto } from '../../dto/query-file.dto';

export abstract class FileRepository {
  abstract create(data: Omit<FileType, 'id'>): Promise<FileType>;

  abstract findById(id: FileType['id']): Promise<NullableType<FileType>>;

  abstract findByIds(ids: FileType['id'][]): Promise<FileType[]>;

  abstract findManyByOwnerIdWithPagination({
    ownerId,
    paginationOptions,
    publicOnly, // <--- ADD this parameter
  }: {
    ownerId: number;
    paginationOptions: IPaginationOptions;
    publicOnly: boolean; // <--- ADD this parameter
  }): Promise<[FileType[], number]>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterFileDto | null;
    sortOptions?: SortFileDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<[FileType[], number]>;

  abstract remove(id: FileType['id']): Promise<void>;
}
