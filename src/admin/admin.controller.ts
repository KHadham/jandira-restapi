import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { FilesService } from '../files/files.service';
import { QueryFileDto } from '../files/dto/query-file.dto';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { FileType } from '../files/domain/file';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin')
@Controller({
  path: 'admin',
  version: '1',
})
export class AdminController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOkResponse({
    type: InfinityPaginationResponse(FileType),
  })
  @Get('files')
  @HttpCode(HttpStatus.OK)
  async findAllFiles(
    @Query() query: QueryFileDto,
  ): Promise<InfinityPaginationResponseDto<FileType>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    const [data, total] = await this.filesService.findManyWithPagination({
      filterOptions: query?.filters,
      sortOptions: query?.sort,
      paginationOptions: {
        page,
        limit,
      },
    });

    return infinityPagination(data, { page, limit }, total);
  }
}
