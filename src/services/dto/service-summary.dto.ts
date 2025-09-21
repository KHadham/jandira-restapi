import { ApiProperty } from '@nestjs/swagger';
import { ServiceTypeEnum } from '../infrastructure/persistence/relational/entities/service.entity';

export class ServiceSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  basePrice: number;

  @ApiProperty()
  location?: string;

  @ApiProperty({ enum: ServiceTypeEnum })
  serviceType: ServiceTypeEnum;

  // We could add a 'thumbnailUrl' here in the future
}
