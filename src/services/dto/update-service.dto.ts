import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// We define a new DTO specifically for updating trip details
// Notice how EVERY property has @IsOptional()
class UpdateTripDetailsDto {
  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @IsOptional() // <-- Now optional
  duration?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @IsOptional() // <-- Now optional
  minAttendees?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isCancellable?: boolean;

  // Note: For simplicity, we are not allowing partial updates to the itinerary array itself yet.
  // It's all or nothing for this field if provided. A more complex merge would be needed.

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

// Now we build our main UpdateServiceDto manually
export class UpdateServiceDto {
  @ApiPropertyOptional({ example: '3-Day Adventure in the Mountains' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'An exciting trip for nature lovers.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1500000 })
  @IsInt()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 'Mountain Peak, West Java' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional() // <-- This property is now optional
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTripDetailsDto) // <-- And it uses our new DTO
  tripDetails?: UpdateTripDetailsDto;
}
