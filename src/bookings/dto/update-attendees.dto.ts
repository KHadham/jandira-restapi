import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// For adding a new attendee
class AddAttendeeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
}

// For updating an existing attendee
class UpdateAttendeeDto {
  @ApiProperty({ description: 'The UUID of the attendee to update' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
}

// The main DTO for the endpoint
export class UpdateAttendeesDto {
  @ApiPropertyOptional({ type: [AddAttendeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddAttendeeDto)
  @IsOptional()
  add?: AddAttendeeDto[];

  @ApiPropertyOptional({ type: [UpdateAttendeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAttendeeDto)
  @IsOptional()
  update?: UpdateAttendeeDto[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'An array of attendee UUIDs to remove',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  remove?: string[];
}
