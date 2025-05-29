import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class AuthPhoneOtpVerifyDto {
  @ApiProperty({
    example: '+6281910859555',
    type: String,
    description: 'User phone number in international format',
  })
  @IsNotEmpty()
  @IsPhoneNumber('ID')
  phone: string;

  @ApiProperty({
    example: '123456',
    type: String,
    description: 'The 6-digit OTP received by the user',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6) // Assuming a 6-digit OTP
  otp: string;
}
