import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatusEnum } from '../infrastructure/persistence/relational/entities/booking.entity';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: BookingStatusEnum,
    example: BookingStatusEnum.CONFIRMED,
  })
  @IsNotEmpty()
  @IsEnum(BookingStatusEnum)
  status: BookingStatusEnum;
}
