import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from 'src/services/infrastructure/persistence/relational/entities/schedule.entity';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Service])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
