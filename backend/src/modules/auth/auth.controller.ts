import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/security/rate-limit.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto, LoginTwoFaDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendMobileOtpDto } from './dto/send-mobile-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyMobileOtpDto } from './dto/verify-mobile-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @RateLimit(5, 60_000)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post('google')
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto.credential);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post('login/2fa')
  loginTwoFa(@Body() dto: LoginTwoFaDto) {
    return this.authService.loginTwoFa(dto);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @RateLimit(5, 60_000)
  @Post('mobile/send-otp')
  sendMobileOtp(@Body() dto: SendMobileOtpDto) {
    return this.authService.sendMobileOtp(dto.mobile);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post('mobile/verify-otp')
  verifyMobileOtp(@Body() dto: VerifyMobileOtpDto) {
    return this.authService.verifyMobileOtp(dto.mobile, dto.code);
  }

  @Public()
  @RateLimit(5, 60_000)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email, dto.captchaToken);
  }

  @Public()
  @RateLimit(5, 60_000)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('logout')
  logout(@CurrentUser() user: { userId: string }, @Body() dto: RefreshDto) {
    return this.authService.logout(user.userId, dto.refreshToken);
  }
}
