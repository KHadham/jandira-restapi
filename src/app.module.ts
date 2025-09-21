import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import redisConfig from './config/redis.config';

import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { RedisModule } from './redis/redis.module';

// --- ADD: Import Throttler and APP_GUARD ---
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
// import { AdminModule } from './admin/admin.module';
import { ImageService } from './image/image.service';
import { ServicesModule } from './services/services.module';
import { BookingsModule } from './bookings/bookings.module';
// --- END OF ADD ---

const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options: DataSourceOptions) => {
    return new DataSource(options).initialize();
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        redisConfig,
      ],
      envFilePath: ['.env'],
    }),
    // --- ADD: Configure ThrottlerModule to use variables from .env ---
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => [
        // <--- START a bracket here
        {
          ttl: configService.getOrThrow('app.throttlerTtl', { infer: true }),
          limit: configService.getOrThrow('app.throttlerLimit', {
            infer: true,
          }),
        },
      ], // <--- END the bracket here
    }),
    // --- END OF ADD ---
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.getOrThrow('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    FilesModule,
    AuthModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    RedisModule,
    ServicesModule,
    BookingsModule,
    // AdminModule,
  ],
  // --- ADD: Register the ThrottlerGuard as a global guard ---
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ImageService,
  ],
  // --- END OF ADD ---
})
export class AppModule {}
