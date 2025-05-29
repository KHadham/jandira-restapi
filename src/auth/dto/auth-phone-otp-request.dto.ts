import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';

export class AuthPhoneOtpRequestDto {
  @ApiProperty({
    example: '+6281910859555',
    type: String,
    description: 'User phone number in international format',
  })
  @IsNotEmpty()
  @IsPhoneNumber('ID') // Using null allows any region, or specify like 'ID' for Indonesia
  phone: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    type: String,
    description: 'User full name (required for first-time registration)',
  })
  @IsOptional() // Will be made conditionally required in the service for new users
  @IsString()
  @MinLength(2)
  fullName?: string;
}
