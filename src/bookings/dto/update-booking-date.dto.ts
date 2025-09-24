import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsNotEmpty } from 'class-validator';

export class UpdateBookingDateDto {
  @ApiProperty({
    example: '2026-01-15',
    description: 'The new desired date for the booking',
  })
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  newBookingDate: Date;
}
