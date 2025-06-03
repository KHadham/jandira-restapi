import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  StreamableFile,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

import { FileRepository } from '../../persistence/file.repository';
import { AllConfigType } from '../../../../config/config.type';
import { FileType } from '../../../domain/file';
import { User } from '../../../../users/domain/user';
import { RoleEnum } from '../../../../roles/roles.enum';
import { FileDriver } from '../../../config/file-config.type';

@Injectable()
export class FilesLocalService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {}

  async create(
    file: Express.Multer.File,
    userId: User['id'],
    isPublic: boolean = false,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }
    const createdFileEntry = await this.fileRepository.create({
      path: file.path,
      ownerId: Number(userId),
      isPublic: isPublic,
      driver: FileDriver.LOCAL,
    });
    return {
      file: createdFileEntry,
    };
  }

  async getFileStream(
    fileId: FileType['id'],
    requestingUser: User,
  ): Promise<{
    stream: StreamableFile;
    contentType: string;
    fileName: string;
  }> {
    const fileMetadata = await this.fileRepository.findById(fileId);

    if (!fileMetadata) {
      throw new NotFoundException('File not found.');
    }

    const isAdmin = requestingUser.role?.id === RoleEnum.admin;
    const isOwner = fileMetadata.ownerId === requestingUser.id;

    if (!fileMetadata.isPublic && !isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }

    const filePath = fileMetadata.path;
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch (error) {
      console.error(`File not found on filesystem: ${filePath}`, error);
      throw new NotFoundException('File not found on storage.');
    }

    const stream = fs.createReadStream(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = path.basename(filePath);

    return {
      stream: new StreamableFile(stream),
      contentType,
      fileName,
    };
  }
}
