import {
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesS3PresignedService } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';
import { User } from 'src/users/domain/user';
import { FileType } from '../../../domain/file';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../../../../users/users.service';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../../../../utils/dto/infinity-pagination-response.dto';
import { QueryUserDto } from '../../../../users/dto/query-user.dto';
import { infinityPagination } from '../../../../utils/infinity-pagination';
import { FileCategoryEnum } from '../../../domain/file-category.enum';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesS3PresignedController {
  constructor(
    private readonly filesService: FilesS3PresignedService,
    private readonly usersService: UsersService,
  ) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiConsumes('multipart/form-data') // <--- ADD: Specify content type
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file')) // <--- ADD: Use the interceptor
  async uploadFile(
    @UploadedFile() file: Express.MulterS3.File, // <--- CHANGE: Get file from @UploadedFile
    @Req() req: { user: User },
  ): Promise<{ file: FileType }> {
    // Return type no longer includes the signed URL
    const userId = req.user.id;

    return this.filesService.create(
      file,
      userId,
      false,
      FileCategoryEnum.GENERAL,
    ); // isPublic: false, isViewable: false
  }

  // <--- ADD NEW SECURE ACCESS ENDPOINT --->
  @ApiOkResponse({
    description: 'Returns a pre-signed URL to view a file.',
    schema: { type: 'object', properties: { url: { type: 'string' } } },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('view/:fileId')
  async viewFile(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
  ): Promise<{ url: string }> {
    return this.filesService.getPresignedUrlForView(fileId, req.user);
  }

  @ApiCreatedResponse({
    description: 'User profile picture uploaded and linked successfully.',
    type: User,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload/profile-picture')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.MulterS3.File,
    @Req() req: { user: User },
  ): Promise<FileType> {
    const userId = req.user.id;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const oldPhotoId = user.photo?.id; // Store old photo ID if it exists

    // 2. Upload the new file and mark it as public
    const { file: newProfilePicture } = await this.filesService.create(
      file,
      userId,
      true,
      FileCategoryEnum.PROFILE_PICTURE, // <--- PASS the correct category
    );

    // 3. Update the user's record to link to the new photo
    const updatedUser = await this.usersService.update(userId, {
      photo: { id: newProfilePicture.id } as FileType,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found after update.');
    }

    // 4. If an old photo existed, delete it
    if (oldPhotoId) {
      await this.filesService.delete(oldPhotoId, req.user);
    }

    return newProfilePicture;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
  ): Promise<void> {
    return this.filesService.delete(fileId, req.user);
  }

  @ApiCreatedResponse({
    description: 'User identity photo uploaded successfully.',
    type: User, // <--- CHANGE: Return the User object
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload/identity-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identityPhoto: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdentityPhoto(
    @UploadedFile() file: Express.MulterS3.File,
    @Req() req: { user: User },
  ): Promise<FileType> {
    const userId = req.user.id;

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const oldIdentityPhotoId = user.identityPhoto?.id;

    const { file: newIdentityPhoto } = await this.filesService.create(
      file,
      userId,
      false, // isPublic: false
      FileCategoryEnum.IDENTITY_CARD,
    );

    // This update call will now correctly pass the identityPhoto
    const updatedUser = await this.usersService.update(userId, {
      identityPhoto: { id: newIdentityPhoto.id } as FileType,
    });

    if (!updatedUser) {
      // Re-check after update
      throw new NotFoundException('User could not be updated.');
    }

    if (oldIdentityPhotoId) {
      await this.filesService.delete(oldIdentityPhotoId, req.user);
    }

    // Return the full, updated user object for a consistent response
    return newIdentityPhoto;
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(FileType),
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id') // Your proposed route
  async findUserFiles(
    @Param('id') targetUserId: string, // ID of the user whose files we want to see
    @Req() req: { user: User }, // The user making the request
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<FileType>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    const [data, total] = await this.filesService.findManyByUserId({
      targetUserId: targetUserId,
      requestingUser: req.user,
      paginationOptions: {
        page,
        limit,
      },
    });

    // We will now modify infinityPagination to handle 'total'
    return infinityPagination(data, { page, limit }, total);
  }
}
