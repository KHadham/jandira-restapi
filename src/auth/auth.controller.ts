import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
  Query, // Import Query
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from './dto/auth-confirm-email.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { User } from '../users/domain/user';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { AuthPhoneOtpRequestDto } from './dto/auth-phone-otp-request.dto';
import { AuthPhoneOtpVerifyDto } from './dto/auth-phone-otp-verify.dto';
import { AuthOtpSentResponseDto } from './dto/auth-otp-sent-response.dto'; // <--- IMPORT NEW DTO

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('phone/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthOtpSentResponseDto })
  async requestOtp(
    @Body() requestOtpDto: AuthPhoneOtpRequestDto,
  ): Promise<AuthOtpSentResponseDto> {
    await this.service.requestOtp(requestOtpDto);
    return {
      message: 'OTP has been sent successfully to your phone number.', // <--- RETURN SUCCESS MESSAGE
    };
  }

  @Post('phone/verify-otp')
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ groups: ['me'] }) // <--- ADD THIS DECORATOR
  async verifyOtpAndLogin(
    @Body() verifyOtpDto: AuthPhoneOtpVerifyDto,
  ): Promise<LoginResponseDto> {
    return this.service.verifyOtpAndLogin(verifyOtpDto);
  }

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('email/login')
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  public login(@Body() loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    return this.service.validateLogin(loginDto);
  }

  @Post('email/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.service.register(createUserDto);
  }

  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmEmail(confirmEmailDto.hash);
  }

  @Get('whatsapp/confirm')
  @HttpCode(HttpStatus.OK) // Changed to HttpStatus.OK
  async whatsappConfirm(@Query('token') token: string): Promise<string> {
    try {
      await this.service.confirmWhatsapp(token);
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Verified</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #fff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 {
              color: #28a745;
              margin-bottom: 20px;
            }
            .success-image {
              max-width: 150px;
              height: auto;
              margin-bottom: 20px;
            }
            p {
              color: #555;
              font-size: 1em;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Successfully Verified!</h1>
            <img src="../../files/logo.png" alt="Success" class="success-image">
            <p>You can now close this window and log in to your account.</p>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('WhatsApp verification error:', error);
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Failed</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #fff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 {
              color: #dc3545;
              margin-bottom: 20px;
            }
            p {
              color: #555;
              font-size: 1em;
              margin-bottom: 15px;
            }
              .success-image {
              max-width: 150px;
              height: auto;
              margin-bottom: 20px;
            }
          </style>
        </head>
       <body>
          <div class="container">
            <h1>Account Verification Failed!</h1>
            <img src="../../files/logo.png" alt="Success" class="success-image">
            <p>Token not found or Account maybe already verified.</p>
          </div>
        </body>
        </html>
      `;
    }
  }

  @Post('email/confirm/new')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmNewEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmNewEmail(confirmEmailDto.hash);
  }

  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() resetPasswordDto: AuthResetPasswordDto): Promise<void> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    type: User,
  })
  @HttpCode(HttpStatus.OK)
  public me(@Request() request): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    type: RefreshResponseDto,
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public refresh(@Request() request): Promise<RefreshResponseDto> {
    return this.service.refreshToken({
      sessionId: request.user.sessionId,
      hash: request.user.hash,
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: User,
  })
  public update(
    @Request() request,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.service.softDelete(request.user);
  }
}
