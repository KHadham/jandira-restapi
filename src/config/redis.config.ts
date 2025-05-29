import { registerAs } from '@nestjs/config';
import { IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import validateConfig from '../utils/validate-config';
import { RedisConfig } from './app-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  REDIS_URI: string;

  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(300)
  OTP_EXPIRES_IN_SECONDS: number;

  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(8)
  OTP_LENGTH: number;

  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(600)
  OTP_COOLDOWN_SECONDS: number;
}

export default registerAs<RedisConfig>('redis', (): RedisConfig => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    uri: process.env.REDIS_URI as string,
    otpExpiresInSeconds: parseInt(
      process.env.OTP_EXPIRES_IN_SECONDS as string,
      10,
    ),
    otpLength: parseInt(process.env.OTP_LENGTH as string, 10) as number,
    otpCooldownSeconds: parseInt(
      process.env.OTP_COOLDOWN_SECONDS as string,
      10,
    ) as number,
  };
});
