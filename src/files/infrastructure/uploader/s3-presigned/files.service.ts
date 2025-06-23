import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FileRepository } from '../../persistence/file.repository';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { FileType } from '../../../domain/file';
import { AllConfigType } from '../../../../config/config.type';
import { FileDriver } from '../../../config/file-config.type';
import { User } from '../../../../users/domain/user';
import { RoleEnum } from '../../../../roles/roles.enum';
import { IPaginationOptions } from '../../../../utils/types/pagination-options';
import { FileCategoryEnum } from '../../../domain/file-category.enum';

@Injectable()
export class FilesS3PresignedService {
  private s3: S3Client;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    this.s3 = new S3Client({
      region: configService.get('file.awsS3Region', { infer: true }),
      endpoint: configService.get('file.awsS3EndpointUrl', { infer: true }),
      credentials: {
        accessKeyId: configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
  }

  async getPresignedUrlForView(
    fileId: string,
    requestingUser: User,
  ): Promise<{ url: string }> {
    const fileMetadata = await this.fileRepository.findById(fileId);

    if (!fileMetadata) {
      throw new NotFoundException('File not found.');
    }

    const isAdmin = requestingUser.role?.id === RoleEnum.admin;
    const isOwner = fileMetadata.ownerId === requestingUser.id;

    // Authorization check
    if (!fileMetadata.isPublic && !isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }
    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
        infer: true,
      }),
      Key: fileMetadata.path,
    });

    // Generate a pre-signed URL for GET request, valid for e.g., 15 minutes (900 seconds)
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });

    return { url };
  }

  async create(
    file: Express.MulterS3.File,
    userId: User['id'],
    isPublic: boolean = false,
    category: FileCategoryEnum,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException(/* ... */);
    }
    const fileEntity = await this.fileRepository.create({
      path: file.key,
      ownerId: Number(userId),
      isPublic: isPublic,
      driver: FileDriver.S3_PRESIGNED,
      category: category, // <--- SET category
    });

    return {
      file: fileEntity,
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

    const command = new DeleteObjectCommand({
      Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
        infer: true,
      }),
      Key: file.path,
    });
    await this.s3.send(command);

    await this.fileRepository.remove(fileId);
  }

  findManyByUserId({
    targetUserId,
    requestingUser,
    paginationOptions,
  }: {
    targetUserId: User['id'];
    requestingUser: User;
    paginationOptions: IPaginationOptions;
  }): Promise<[FileType[], number]> {
    const publicOnly = requestingUser.id !== targetUserId;

    return this.fileRepository.findManyByOwnerIdWithPagination({
      ownerId: Number(targetUserId),
      paginationOptions,
      publicOnly: publicOnly,
    });
  }
}
