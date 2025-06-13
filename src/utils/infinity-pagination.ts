import { IPaginationOptions } from './types/pagination-options';
import { InfinityPaginationResponseDto } from './dto/infinity-pagination-response.dto';

export const infinityPagination = <T>(
  data: T[],
  options: IPaginationOptions,
  total?: number, // <--- ADD optional total parameter
): InfinityPaginationResponseDto<T> => {
  // If total is provided, hasNextPage is determined by whether there are more items to fetch.
  // Otherwise, use the old logic (data length equals limit).
  const hasNextPage = total
    ? options.page * options.limit < total
    : data.length === options.limit;

  return {
    data,
    hasNextPage: hasNextPage,
  };
};
