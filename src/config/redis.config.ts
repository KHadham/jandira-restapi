import { registerAs } from '@nestjs/config';
import { IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer'; // <--- IMPORT THIS
import validateConfig from '../utils/validate-config';
import { RedisConfig } from './app-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  REDIS_URI: string;

  @Type(() => Number) // <--- ADD THIS LINE
  @IsInt()
  @Min(60)
  @Max(300)
  OTP_EXPIRES_IN_SECONDS: number;

  @Type(() => Number) // <--- ADD THIS LINE (for OTP_LENGTH too)
  @IsInt()
  @Min(4)
  @Max(8)
  OTP_LENGTH: number;

  @Type(() => Number) // <--- ADD VALIDATION FOR COOLDOWN
  @IsInt()
  @Min(30) // Minimum 30 seconds cooldown
  @Max(600) // Maximum 10 minutes cooldown
  OTP_COOLDOWN_SECONDS: number;
}

export default registerAs<RedisConfig>('redis', (): RedisConfig => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    uri: process.env.REDIS_URI as string, // It's validated as string now
    otpExpiresInSeconds: parseInt(
      process.env.OTP_EXPIRES_IN_SECONDS as string, // It's validated now
      10,
    ) as number,
    otpLength: parseInt(process.env.OTP_LENGTH as string, 10) as number, // It's validated now
    otpCooldownSeconds: parseInt(
      process.env.OTP_COOLDOWN_SECONDS as string,
      10,
    ) as number, // <--- ADD THIS LINE
  };
});
