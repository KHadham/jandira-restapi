import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './infrastructure/persistence/relational/entities/booking.entity';
import { Service } from 'src/services/infrastructure/persistence/relational/entities/service.entity';
import { Attendee } from './infrastructure/persistence/relational/entities/attendee.entity'; // <-- Import this
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity'; // <-- Import this

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Service,
      Attendee, // <-- Register Attendee
      UserEntity, // <-- Register UserEntity
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
