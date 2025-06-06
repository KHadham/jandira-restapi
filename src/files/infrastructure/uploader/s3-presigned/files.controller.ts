import {
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
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

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesS3PresignedController {
  constructor(private readonly filesService: FilesS3PresignedService) {}

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
}
