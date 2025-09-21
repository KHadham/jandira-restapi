import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './infrastructure/persistence/relational/entities/service.entity';
import { TripDetails } from './infrastructure/persistence/relational/entities/trip-details.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service, TripDetails])],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
