import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ServiceTypeEnum } from '../infrastructure/persistence/relational/entities/service.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItineraryDay } from '../infrastructure/persistence/relational/entities/trip-details.entity';

// DTO for the nested Itinerary object
class ItineraryDayDto implements ItineraryDay {
  @ApiProperty({ example: 1 })
  @IsNumber()
  day: number;

  @ApiProperty({ example: 'Arrival and Relaxation' })
  @IsString()
  title: string;

  @ApiProperty({
    example: [{ time: '14:00', description: 'Check in to hotel' }],
  })
  @IsArray()
  activities: { time: string; description: string }[];
}

// DTO for the nested TripDetails object
class TripDetailsDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  duration: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  minAttendees: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isCancellable?: boolean;

  @ApiPropertyOptional({ type: [ItineraryDayDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @ApiPropertyOptional({ example: ['3 meals per day', 'Accommodation'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inclusions?: string[];

  @ApiPropertyOptional({ example: ['Airfare', 'Personal expenses'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclusions?: string[];
}

// Main DTO for creating a Service
export class CreateServiceDto {
  @ApiProperty({ example: '3-Day Adventure in the Mountains' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'An exciting trip for nature lovers.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 1500000 })
  @IsNotEmpty()
  @IsInt()
  basePrice: number;

  @ApiPropertyOptional({ example: 'Mountain Peak, West Java' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ enum: ServiceTypeEnum, example: ServiceTypeEnum.TRIP })
  @IsEnum(ServiceTypeEnum)
  serviceType: ServiceTypeEnum;

  @ApiProperty()
  @IsObject()
  @ValidateNested() // This is crucial for validating the nested object
  @Type(() => TripDetailsDto) // This is crucial for class-transformer
  tripDetails: TripDetailsDto;
}
