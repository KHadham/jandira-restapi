import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  StreamableFile,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { FileRepository } from '../../persistence/file.repository';
import { AllConfigType } from 'src/config/config.type';
import { FileType } from '../../../domain/file';
import { User } from '../../../../users/domain/user';
import { RoleEnum } from '../../../../roles/roles.enum';
import { FileDriver } from '../../../config/file-config.type';
import { FileCategoryEnum } from 'src/files/domain/file-category.enum';
import { ImageService } from '../../../../image/image.service';

@Injectable()
export class FilesLocalService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
    private readonly imageService: ImageService, // Inject ImageService
  ) {}

  async create(
    file: Express.Multer.File,
    userId: User['id'],
    isPublic: boolean = false,
    category: FileCategoryEnum = FileCategoryEnum.GENERAL,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }
    // Generate thumbnail if the file is an image
    let thumbnailPath: string | null = null;
    if (file.mimetype.startsWith('image/')) {
      thumbnailPath = await this.imageService.createThumbnail(file.path);
    }
    const createdFileEntry = await this.fileRepository.create({
      path: file.path.replace(/\\/g, '/'), // Normalize path for consistency
      thumbnailPath: thumbnailPath, // Save thumbnail path
      ownerId: Number(userId),
      isPublic: isPublic,
      driver: FileDriver.LOCAL,
      category: category,
    });
    return {
      file: createdFileEntry,
    };
  }

  async delete(fileId: string, requestingUser: User): Promise<void> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    const isAdmin = requestingUser.role?.id === RoleEnum.admin;
    const isOwner = file.ownerId === requestingUser.id;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this file.',
      );
    }
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error(`Error deleting file from filesystem: ${file.path}`, error);
    }

    if (file.thumbnailPath) {
      try {
        await fs.unlink(file.thumbnailPath);
      } catch (error) {
        console.error(`Error deleting thumbnail: ${file.thumbnailPath}`, error);
      }
    }
    await this.fileRepository.remove(fileId);
  }

  async getFileStream(
    fileId: FileType['id'],
    requestingUser: User,
    isThumbnail: boolean = false, // <--- ADD this optional flag
  ): Promise<{
    stream: StreamableFile;
    contentType: string;
    fileName: string;
  }> {
    const fileMetadata = await this.fileRepository.findById(fileId);
    if (!fileMetadata) {
      throw new NotFoundException('File not found in database.');
    }
    const isAdmin = requestingUser.role?.id === RoleEnum.admin;
    const isOwner = fileMetadata.ownerId === requestingUser.id;
    if (!fileMetadata.isPublic && !isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }
    const filePath = isThumbnail
      ? fileMetadata.thumbnailPath
      : fileMetadata.path;

    if (!filePath) {
      throw new NotFoundException(
        isThumbnail ? 'Thumbnail not found.' : 'File not found on storage.',
      );
    }
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File not found on filesystem: ${filePath}`, error);
      throw new NotFoundException('File not found on storage.');
    }
    const stream = createReadStream(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = path.basename(filePath);
    return {
      stream: new StreamableFile(stream),
      contentType,
      fileName,
    };
  }
}
