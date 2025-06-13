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
      // <--- ADD: Describe the expected body for Swagger
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
    const userId = req.user.id as number;

    // Pass the file object from multer-s3 directly to the service
    return this.filesService.create(file, userId, false);
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
  @UseInterceptors(FileInterceptor('profilePicture'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.MulterS3.File,
    @Req() req: { user: User },
  ): Promise<User> {
    const userId = req.user.id as number;

    // 1. Find the user to check for an existing photo
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const oldPhotoId = user.photo?.id; // Store old photo ID if it exists

    // 2. Upload the new file and mark it as public
    const { file: newProfilePicture } = await this.filesService.create(
      file,
      userId,
      true, // isPublic: true
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

    return updatedUser;
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

  @ApiOkResponse({
    type: InfinityPaginationResponse(FileType),
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id') // Your proposed route
  async findUserFiles(
    @Param('id') targetUserId: number, // ID of the user whose files we want to see
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
