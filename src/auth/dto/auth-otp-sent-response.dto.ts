import { ApiProperty } from '@nestjs/swagger';

export class AuthOtpSentResponseDto {
  @ApiProperty({
    example: 'OTP has been sent successfully to your phone number.',
    type: String,
  })
  message: string;
}
