import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesLocalService } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';
import { User } from 'src/users/domain/user';
import type { Response as ExpressResponse } from 'express';
import { UsersService } from '../../../../users/users.service';
import { FileType } from '../../../domain/file';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesLocalController {
  constructor(
    private readonly filesService: FilesLocalService,
    private readonly usersService: UsersService,
  ) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiConsumes('multipart/form-data')
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: User },
  ): Promise<FileResponseDto> {
    return this.filesService.create(file, req.user.id, false);
  }

  @ApiCreatedResponse({
    description: 'User profile picture uploaded successfully.',
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
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: User },
  ): Promise<User> {
    const userId = req.user.id;

    const { file: newProfilePicture } = await this.filesService.create(
      file,
      userId,
      true,
    );

    const updatedUser = await this.usersService.update(userId, {
      photo: { id: newProfilePicture.id } as FileType,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found or update failed.');
    }
    return updatedUser;
  }

  @ApiOkResponse({
    description: 'Streams the requested file if authorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('view/:fileId')
  async viewFile(
    @Param('fileId') fileId: string,
    @Req() req: { user: User },
    @Res({ passthrough: true }) response: ExpressResponse,
  ): Promise<StreamableFile> {
    try {
      const { stream, contentType, fileName } =
        await this.filesService.getFileStream(fileId, req.user);

      response.setHeader('Content-Type', contentType);
      response.setHeader(
        'Content-Disposition',
        `inline; filename="${fileName}"`,
      );

      return stream;
    } catch (error) {
      throw error;
    }
  }
}
