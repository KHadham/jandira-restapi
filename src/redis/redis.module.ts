import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AllConfigType } from '../config/config.type';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global() // Make Redis client available globally
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const redisUri = configService.get('redis.uri', { infer: true });
        if (!redisUri) {
          throw new Error('REDIS_URI environment variable not set.');
        }
        // ioredis handles 'rediss://' for SSL/TLS connections
        return new Redis(redisUri);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
