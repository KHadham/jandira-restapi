import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  ServiceUnavailableException,
} from '@nestjs/common';
import ms from 'ms';
import crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthProvidersEnum } from './auth-providers.enum';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseDto } from './dto/login-response.dto';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { AllConfigType } from '../config/config.type';
import { MailService } from '../mail/mail.service';
import { RoleEnum } from '../roles/roles.enum';
import { Session } from '../session/domain/session';
import { SessionService } from '../session/session.service';
import { StatusEnum } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';
import axios from 'axios';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { AuthPhoneOtpRequestDto } from './dto/auth-phone-otp-request.dto';
import { AuthPhoneOtpVerifyDto } from './dto/auth-phone-otp-verify.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private jwtService: JwtService,
    private usersService: UsersService,
    private sessionService: SessionService,
    private mailService: MailService,
    private configService: ConfigService<AllConfigType>,
  ) {}

  private generateOtp(length: number): string {
    return crypto
      .randomInt(0, Math.pow(10, length))
      .toString()
      .padStart(length, '0');
  }

  private getOtpKey(phone: string): string {
    return `otp:${phone}`;
  }

  private getOtpCooldownKey(phone: string): string {
    // <--- New helper for cooldown key
    return `otp_cooldown:${phone}`;
  }

  async storeOtp(phone: string, fullName?: string | null): Promise<string> {
    const otpLength =
      this.configService.get('redis.otpLength', { infer: true }) || 6;
    const expiresIn =
      this.configService.get('redis.otpExpiresInSeconds', { infer: true }) ||
      300;
    const otp = this.generateOtp(otpLength);
    const key = this.getOtpKey(phone);

    // Store OTP and potentially fullName
    const dataToStore = {
      otp: otp,
      fullName: fullName, // Will be null if user exists or not provided
    };

    await this.redis.set(key, JSON.stringify(dataToStore), 'EX', expiresIn);
    return otp;
  }

  async verifyOtp(
    phone: string,
    otpToVerify: string,
  ): Promise<{ otp: string; fullName: string | null }> {
    const key = this.getOtpKey(phone);
    const storedDataString = await this.redis.get(key);

    if (!storedDataString) {
      throw new UnprocessableEntityException('OTP expired or not found.');
    }

    const storedData = JSON.parse(storedDataString) as {
      otp: string;
      fullName: string | null;
    };

    if (storedData.otp !== otpToVerify) {
      throw new UnprocessableEntityException('Invalid OTP.');
    }

    await this.redis.del(key); // Delete after successful verification
    return storedData;
  }

  async sendOtpViaWhatsApp(phone: string, otp: string): Promise<void> {
    // Correctly get the Fonnte token
    const fonnteToken = this.configService.get('app.fonnteToken', {
      infer: true,
    });
    if (!fonnteToken) {
      console.error('FONTEE_TOKEN is not set in environment variables.');
      throw new Error('OTP sending service is not configured.');
    }
    const message = `Your verification code is: ${otp}. Do not share it with anyone.`;

    try {
      console.log(`Sending OTP ${otp} to ${phone} via WhatsApp (Fonnte)`);
      // Ensure you have axios installed (npm install axios) or use another HTTP client
      const response = await axios.get(
        `https://api.fonnte.com/send?token=${fonnteToken}&target=${phone}&message=${message}`,
      );
      console.log('Fonnte API response:', response.data);
      if (response.data.status === false) {
        // Check Fonnte's specific error response
        console.error(
          'Fonnte API error:',
          response.data.reason ||
            response.data.detail ||
            'Unknown Fonnte error',
        );
        throw new Error(
          'Failed to send OTP via Fonnte. ' +
            (response.data.reason || response.data.detail),
        );
      }
    } catch (error) {
      console.error(`Failed to send OTP to ${phone}:`, error);
      throw new Error('Failed to send OTP.');
    }
  }

  async requestOtp(dto: AuthPhoneOtpRequestDto): Promise<void> {
    const { phone, fullName } = dto;
    const cooldownSeconds = this.configService.get('redis.otpCooldownSeconds', {
      infer: true,
    }) as number;
    const cooldownKey = this.getOtpCooldownKey(phone);

    const lastRequestTimestampString = await this.redis.get(cooldownKey);
    if (lastRequestTimestampString) {
      const lastRequestTimestamp = parseInt(lastRequestTimestampString, 10);
      const timeSinceLastRequest = (Date.now() - lastRequestTimestamp) / 1000; // in seconds

      if (timeSinceLastRequest < cooldownSeconds) {
        const timeLeft = Math.ceil(cooldownSeconds - timeSinceLastRequest);
        throw new ServiceUnavailableException(
          `Please wait ${timeLeft} seconds before requesting another OTP.`,
        );
      }
    }

    let user: User | null;
    try {
      // We need a findByPhone method in UsersService (Step 5)
      user = await this.usersService.findByPhone(phone);
    } catch (error) {
      // Assume NotFoundException means user doesn't exist
      if (error instanceof NotFoundException) {
        user = null;
      } else {
        throw error; // Re-throw other errors
      }
    }

    let nameToStore: string | null = null;

    if (!user) {
      // User doesn't exist - this is a registration attempt.
      if (!fullName) {
        throw new BadRequestException(
          'Full name is required for registration.',
        );
      }
      nameToStore = fullName;
    }

    // Store OTP (and fullName if it's a new user)
    const otp = await this.storeOtp(phone, nameToStore);

    // Send OTP via WhatsApp (or SMS)
    await this.sendOtpViaWhatsApp(phone, otp);
    await this.redis.set(
      cooldownKey,
      Date.now().toString(),
      'EX',
      cooldownSeconds,
    );
  }

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'notFound',
        },
      });
    }

    if (user.provider !== AuthProvidersEnum.email) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: `needLoginViaProvider:${user.provider}`,
        },
      });
    }

    if (!user.password) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async validateSocialLogin(
    authProvider: string,
    socialData: SocialInterface,
  ): Promise<LoginResponseDto> {
    let user: NullableType<User> = null;
    const socialEmail = socialData.email?.toLowerCase();
    let userByEmail: NullableType<User> = null;

    if (socialEmail) {
      userByEmail = await this.usersService.findByEmail(socialEmail);
    }

    if (socialData.id) {
      user = await this.usersService.findBySocialIdAndProvider({
        socialId: socialData.id,
        provider: authProvider,
      });
    }

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
      }
      await this.usersService.update(user.id, user);
    } else if (userByEmail) {
      user = userByEmail;
    } else if (socialData.id) {
      const role = {
        id: RoleEnum.user,
      };
      const status = {
        id: StatusEnum.active,
      };

      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        socialId: socialData.id,
        provider: authProvider,
        role,
        status,
      });

      user = await this.usersService.findById(user.id);
    }

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token: jwtToken,
      tokenExpires,
      user,
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      phone: dto.phone, // Save the phone number to the user object
      role: {
        id: RoleEnum.user,
      },
      status: {
        id: StatusEnum.inactive,
      },
    });

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    const whatsappApiUrl = 'https://api.fonnte.com/send';
    const whatsappToken = this.configService.get('app.fonnteToken', {
      infer: true,
    });
    if (!whatsappToken) {
      console.error('FONTEE_TOKEN is not set in environment variables.');
      throw new Error('WhatsApp sending service is not configured.');
    }
    const targetPhoneNumber = dto.phone; // Use the phone number from the DTO
    const verificationUrl = `10.77.61.76:3000/api/v1/auth/whatsapp/confirm?token=${hash}`;

    try {
      await axios.get(
        `${whatsappApiUrl}?token=${whatsappToken}&target=${targetPhoneNumber}&message=${verificationUrl}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      // Log the success or handle it as needed
      console.log(`WhatsApp verification sent to ${targetPhoneNumber}`);
      // You might want to update the user's status or save the verification token
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      // Handle the error appropriately (e.g., throw an exception)
    }
  }

  private splitFullName(fullName: string): {
    firstName: string | null;
    lastName: string | null;
  } {
    const parts = fullName.trim().split(' ');
    const firstName = parts.length > 0 ? parts[0] : null;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
    return { firstName, lastName };
  }

  private async generateTokens(user: User): Promise<LoginResponseDto> {
    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: user.id,
          role: user.role,
          sessionId: 'dummy-session-id', // We might need real session handling later
        },
        {
          secret: this.configService.get('auth.secret', { infer: true }),
          expiresIn: this.configService.get('auth.expires', { infer: true }),
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: 'dummy-session-id', // We might need real session handling later
        },
        {
          secret: this.configService.get('auth.refreshSecret', { infer: true }),
          expiresIn: this.configService.get('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires: this.configService.get('auth.expires', {
        infer: true,
      }) as number,
      user,
    };
  }

  async verifyOtpAndLogin(
    dto: AuthPhoneOtpVerifyDto,
  ): Promise<LoginResponseDto> {
    const { phone, otp } = dto;

    // Verify OTP and get stored data (including potential fullName)
    const storedData = await this.verifyOtp(phone, otp);

    let user: User | null = null;

    if (storedData.fullName) {
      // This was a registration - create the user
      const { firstName, lastName } = this.splitFullName(storedData.fullName);

      user = await this.usersService.create({
        phone: phone,
        firstName: firstName,
        lastName: lastName,
        email: null, // No email in this flow
        password: undefined, // No password in this flow
        provider: AuthProvidersEnum.otp, // We should add 'OTP' to AuthProvidersEnum
        role: { id: RoleEnum.user } as any, // Assign default user role
        status: { id: StatusEnum.active } as any, // Set as active immediately
      });
    } else {
      // User should already exist - find them
      try {
        user = await this.usersService.findByPhone(phone);
      } catch (error) {
        // This shouldn't happen if the logic is correct, but handle it
        console.error('Error finding user after OTP verify:', error);
        throw new UnprocessableEntityException(
          'Could not process login after OTP verification.',
        );
      }
    }

    if (!user) {
      throw new UnprocessableEntityException(
        'User could not be found or created.',
      );
    }

    // Generate and return JWTs
    return this.generateTokens(user);
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      user?.status?.id?.toString() !== StatusEnum.inactive.toString()
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async confirmNewEmail(hash: string): Promise<void> {
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.email = newEmail;
    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailNotExists',
        },
      });
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `notFound`,
        },
      });
    }

    user.password = password;

    await this.sessionService.deleteByUserId({
      userId: user.id,
    });

    await this.usersService.update(user.id, user);
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'missingOldPassword',
          },
        });
      }

      if (!currentUser.password) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      } else {
        await this.sessionService.deleteByUserIdWithExclude({
          userId: currentUser.id,
          excludeSessionId: userJwtPayload.sessionId,
        });
      }
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailExists',
          },
        });
      }

      const hash = await this.jwtService.signAsync(
        {
          confirmEmailUserId: currentUser.id,
          newEmail: userDto.email,
        },
        {
          secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );

      await this.mailService.confirmNewEmail({
        to: userDto.email,
        data: {
          hash,
        },
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.update(userJwtPayload.id, userDto);

    return this.usersService.findById(userJwtPayload.id);
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const session = await this.sessionService.findById(data.sessionId);

    if (!session) {
      throw new UnauthorizedException();
    }

    if (session.hash !== data.hash) {
      throw new UnauthorizedException();
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const user = await this.usersService.findById(session.user.id);

    if (!user?.role) {
      throw new UnauthorizedException();
    }

    await this.sessionService.update(session.id, {
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: {
        id: user.role.id,
      },
      sessionId: session.id,
      hash,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async softDelete(user: User): Promise<void> {
    await this.usersService.remove(user.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async confirmWhatsapp(token: string): Promise<{ message: string }> {
    let userId: User['id'];
    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(token, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          token: `invalidToken`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      user?.status?.id?.toString() !== StatusEnum.inactive.toString()
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `Verification code not found or already verified.`,
      });
    }

    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);

    return {
      message: 'Account successfully verified.',
    };
  }
}
