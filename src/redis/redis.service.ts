import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';
import { AllConfigType } from '../config/config.type'; // Import AllConfigType

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;
  private readonly logger = new Logger(RedisService.name);
  private otpExpiry: number;

  constructor(private configService: ConfigService<AllConfigType>) {
    // Use AllConfigType
    const redisConfig = this.configService.get('redis', { infer: true });
    if (!redisConfig || !redisConfig.uri) {
      throw new Error('REDIS_URI is not defined in the configuration.');
    }
    this.client = new Redis(redisConfig.uri);
    this.otpExpiry = redisConfig.otpExpiresInSeconds;
  }

  onModuleInit() {
    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis.');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed.');
    }
  }

  private getOtpKey(phone: string): string {
    return `otp:${phone}`;
  }

  async setOtp(phone: string, otp: string): Promise<'OK'> {
    const key = this.getOtpKey(phone);
    this.logger.log(`Storing OTP for ${phone} with expiry ${this.otpExpiry}s`);
    return this.client.set(key, otp, 'EX', this.otpExpiry);
  }

  async getOtp(phone: string): Promise<string | null> {
    const key = this.getOtpKey(phone);
    return this.client.get(key);
  }

  async delOtp(phone: string): Promise<number> {
    const key = this.getOtpKey(phone);
    return this.client.del(key);
  }

  // Optional: A helper to generate OTPs
  generateOtp(length = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }
}
