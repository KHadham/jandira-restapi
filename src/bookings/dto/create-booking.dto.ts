import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class AttendeeDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  email?: string | null;

  @ApiPropertyOptional({ example: '081234567890' }) // Use ApiPropertyOptional
  @IsOptional() // Add IsOptional
  @IsPhoneNumber('ID') // Keep the validation for when it IS provided
  @ValidateIf((o) => !o.email)
  phone?: string | null; // Make it optional with '?'
}

export class CreateBookingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2025-12-25' })
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  bookingDate: Date;

  @ApiProperty({ type: [AttendeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees: AttendeeDto[];
}
