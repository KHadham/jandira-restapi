import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesLocalService } from './files.service';
import { User } from 'src/users/domain/user';
import type { Response as ExpressResponse } from 'express';
import { UsersService } from '../../../../users/users.service';
import { FileType } from '../../../domain/file';
import { FileCategoryEnum } from 'src/files/domain/file-category.enum';
import { FilesService } from 'src/files/files.service';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from 'src/utils/dto/infinity-pagination-response.dto';
import { QueryUserDto } from 'src/users/dto/query-user.dto';
import { infinityPagination } from 'src/utils/infinity-pagination';

@ApiTags('Files')
@Controller({ path: 'files', version: '1' })
export class FilesLocalController {
  constructor(
    private readonly localFilesService: FilesLocalService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: User },
  ): Promise<{ file: FileType }> {
    return this.localFilesService.create(
      file,
      req.user.id,
      true,
      FileCategoryEnum.GENERAL,
    );
  }

  @Post('upload/profile-picture')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { profilePicture: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('profilePicture'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: User },
  ): Promise<User> {
    const userId = req.user.id;
    const user = await this.usersService.findById(userId, req.user);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const oldPhotoId = user.photo?.id;
    const { file: newProfilePicture } = await this.localFilesService.create(
      file,
      userId,
      true,
      FileCategoryEnum.PROFILE_PICTURE,
    );
    const updatedUser = await this.usersService.update(
      userId,
      { photo: { id: newProfilePicture.id } as FileType },
      req.user,
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found after update.');
    }
    if (oldPhotoId) {
      await this.localFilesService.delete(oldPhotoId, req.user);
    }
    return updatedUser;
  }

  @Post('upload/identity-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { identityPhoto: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('identityPhoto'))
  async uploadIdentityPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: User },
  ): Promise<User> {
    const userId = req.user.id;
    const user = await this.usersService.findById(userId, req.user);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const oldIdentityPhotoId = user.identityPhoto?.id;
    const { file: newIdentityPhoto } = await this.localFilesService.create(
      file,
      userId,
      false,
      FileCategoryEnum.IDENTITY_CARD,
    );
    const updatedUser = await this.usersService.update(
      userId,
      { identityPhoto: { id: newIdentityPhoto.id } as FileType },
      req.user,
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found after update.');
    }
    if (oldIdentityPhotoId) {
      await this.localFilesService.delete(oldIdentityPhotoId, req.user);
    }
    return updatedUser;
  }

  @Get('view/:fileId')
  @ApiOkResponse({ description: 'Streams the requested file if authorized.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async viewFile(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<StreamableFile> {
    const { stream, contentType, fileName } =
      await this.localFilesService.getFileStream(fileId, req.user);
    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return stream;
  }

  @ApiOkResponse({
    description: 'Streams the requested thumbnail if authorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('view/:fileId/thumbnail')
  async viewThumbnail(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<StreamableFile> {
    const { stream, contentType, fileName } =
      await this.localFilesService.getFileStream(fileId, req.user, true); // Pass true for thumbnail
    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return stream;
  }

  @Delete(':fileId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
  ): Promise<void> {
    return this.localFilesService.delete(fileId, req.user);
  }

  @Get('users/:id')
  @ApiOkResponse({ type: InfinityPaginationResponse(FileType) })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async findUserFiles(
    @Param('id') targetUserId: string,
    @Req() req: { user: User },
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<FileType>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }
    const [data, total] = await this.filesService.findManyByUserId({
      targetUserId,
      requestingUser: req.user,
      paginationOptions: { page, limit },
    });
    return infinityPagination(data, { page, limit }, total);
  }
}
