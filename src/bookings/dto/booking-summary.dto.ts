import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatusEnum } from '../infrastructure/persistence/relational/entities/booking.entity';
import { ServiceSummaryDto } from '../../services/dto/service-summary.dto';

export class BookingSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingDate: Date;

  @ApiProperty({ enum: BookingStatusEnum })
  status: BookingStatusEnum;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty({
    description: 'The calculated number of attendees in this booking',
  })
  attendeeCount: number;

  @ApiPropertyOptional({
    description: "URL to the user's uploaded payment proof",
  })
  paymentProofUrl?: string;

  @ApiProperty({ type: () => ServiceSummaryDto })
  service: ServiceSummaryDto;
}
