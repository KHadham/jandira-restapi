import {
  forwardRef,
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FilesLocalController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { FilesLocalService } from './files.service';
import { RelationalFilePersistenceModule } from '../../persistence/relational/relational-persistence.module';
import { AllConfigType } from '../../../../config/config.type';
import { UsersModule } from '../../../../users/users.module';
import { FilesModule } from '../../../files.module';
import { ImageModule } from '../../../../image/image.module';

const infrastructurePersistenceModule = RelationalFilePersistenceModule;

@Module({
  imports: [
    ImageModule,
    forwardRef(() => UsersModule),
    forwardRef(() => FilesModule),
    infrastructurePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return {
          fileFilter: (request, file, callback) => {
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
              return callback(
                new UnprocessableEntityException({
                  status: HttpStatus.UNPROCESSABLE_ENTITY,
                  errors: { file: `cantUploadFileType` },
                }),
                false,
              );
            }
            callback(null, true);
          },
          storage: diskStorage({
            destination: './files',
            filename: (request, file, callback) => {
              callback(
                null,
                `${randomStringGenerator()}.${file.originalname
                  .split('.')
                  .pop()
                  ?.toLowerCase()}`,
              );
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesLocalController],
  providers: [ConfigModule, ConfigService, FilesLocalService],
  exports: [FilesLocalService],
})
export class FilesLocalModule {}
