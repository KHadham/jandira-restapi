import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FilesModule } from '../files/files.module'; // Import FilesModule to get access to FilesService

@Module({
  imports: [FilesModule], // FilesService is exported from FilesModule
  controllers: [AdminController],
})
export class AdminModule {}
