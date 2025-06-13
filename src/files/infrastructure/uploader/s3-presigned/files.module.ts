import {
  HttpStatus,
  Module,
  UnprocessableEntityException,
  forwardRef, // We likely need forwardRef here too
} from '@nestjs/common';
import { FilesS3PresignedController } from './files.controller';
import { FilesS3PresignedService } from './files.service';
import { MulterModule } from '@nestjs/platform-express'; // <--- Import
import { ConfigModule, ConfigService } from '@nestjs/config'; // <--- Import
import { S3Client } from '@aws-sdk/client-s3'; // <--- Import
import multerS3 from 'multer-s3'; // <--- Import
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util'; // <--- Import
import { AllConfigType } from 'src/config/config.type';
import { RelationalFilePersistenceModule } from '../../persistence/relational/relational-persistence.module';
import { UsersModule } from 'src/users/users.module';

const infrastructurePersistenceModule = RelationalFilePersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    forwardRef(() => UsersModule),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const s3 = new S3Client({
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

        return {
          fileFilter: (request, file, callback) => {
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

            if (!allowedMimeTypes.includes(file.mimetype)) {
              return callback(
                new UnprocessableEntityException({
                  status: HttpStatus.UNPROCESSABLE_ENTITY,
                  errors: {
                    file: `File type ${file.mimetype} is not allowed.`,
                  },
                }),
                false,
              );
            }

            callback(null, true);
          },
          storage: multerS3({
            s3: s3,
            bucket: configService.getOrThrow('file.awsDefaultS3Bucket', {
              infer: true,
            }), // <-- Tells multer-s3 the bucket
            acl: 'public-read', // Or 'private' if your bucket policy is set up for presigned URLs
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: (request, file, callback) => {
              callback(
                null,
                `${randomStringGenerator()}.${file.originalname.split('.').pop()?.toLowerCase()}`,
              );
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
    // --- END OF MulterModule CONFIGURATION ---
  ],
  controllers: [FilesS3PresignedController],
  providers: [FilesS3PresignedService], // We don't need to provide ConfigService here if it's global
  exports: [FilesS3PresignedService],
})
export class FilesS3PresignedModule {}
