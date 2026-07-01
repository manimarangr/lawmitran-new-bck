import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { OtpService } from '../../common/otp/otp.service';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
// OTP is only sent at signup verification (keeps SMS/WhatsApp cost ~1 per user).
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private recaptcha: RecaptchaService,
    private mail: MailService,
    private otp: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot self-register as admin');
    }

    const captchaValid = await this.recaptcha.verify(dto.captchaToken);
    if (!captchaValid) {
      throw new BadRequestException('Captcha verification failed');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { mobile: dto.mobile }] },
    });
    if (existing) {
      throw new BadRequestException('Email or mobile already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomUUID();
    const emailVerificationExpiresAt = new Date();
    emailVerificationExpiresAt.setHours(
      emailVerificationExpiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        role: dto.role,
        emailVerificationToken,
        emailVerificationExpiresAt,
      },
    });

    // Email verification link is free — send it, but it's a soft prompt (login is not blocked on it).
    await this.mail.sendEmailVerification(user.email, emailVerificationToken);

    // Signup verification uses ONE mobile OTP for every role (WhatsApp-first).
    // This is the hard gate before login; no OTP is sent on subsequent logins.
    await this.sendMobileOtp(user.mobile);

    return {
      userId: user.id,
      mobileVerificationRequired: true,
      emailVerificationRequired: false, // soft — verify anytime to receive emails
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Mobile OTP is the signup verification gate for every role.
    // Email verification is a soft prompt and does NOT block login.
    if (!user.mobileVerified) {
      throw new ForbiddenException(
        'Please verify your mobile number to finish signing up',
      );
    }
    return this.issueTokens(user.id, user.role, dto.rememberMe ?? false);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const SAFE_RESPONSE = {
      message: 'If an account with that email exists, a reset link has been sent.',
    };

    if (!user) return SAFE_RESPONSE;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TTL_HOURS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    const frontendOrigin = this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:3000');
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;
    await this.mail.sendPasswordResetEmail(email, resetUrl);

    return SAFE_RESPONSE;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Password updated successfully.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { success: true };
  }

  async sendMobileOtp(mobile: string) {
    const user = await this.prisma.user.findUnique({ where: { mobile } });
    if (!user) {
      throw new NotFoundException('No account found for this mobile number');
    }
    if (user.mobileVerified) {
      throw new ConflictException('Mobile number is already verified');
    }

    // Resend throttle — protects against SMS/WhatsApp bill abuse.
    if (user.mobileOtpLastSentAt) {
      const elapsedSec =
        (Date.now() - user.mobileOtpLastSentAt.getTime()) / 1000;
      if (elapsedSec < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(
            OTP_RESEND_COOLDOWN_SECONDS - elapsedSec,
          )}s before requesting another code`,
        );
      }
    }

    const code = this.otp.generateCode();
    const expiresAt = new Date(Date.now() + this.otp.ttlMs);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mobileOtpHash: this.otp.hash(code),
        mobileOtpExpiresAt: expiresAt,
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
        mobileOtpLastSentAt: new Date(),
      },
    });

    const channel = await this.otp.deliver(mobile, code);
    return { success: true, channel };
  }

  async verifyMobileOtp(mobile: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { mobile } });
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP code');
    }
    if (user.mobileVerified) {
      throw new ConflictException('Mobile number is already verified');
    }
    if (user.mobileOtpLockedUntil && user.mobileOtpLockedUntil > new Date()) {
      throw new ForbiddenException(
        'Too many incorrect attempts. Please request a new code shortly.',
      );
    }
    if (!user.mobileOtpHash || !user.mobileOtpExpiresAt) {
      throw new BadRequestException('Please request a verification code first');
    }
    if (user.mobileOtpExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    const isMatch = user.mobileOtpHash === this.otp.hash(code);
    if (!isMatch) {
      const attempts = user.mobileOtpAttempts + 1;
      const lock = attempts >= OTP_MAX_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mobileOtpAttempts: attempts,
          mobileOtpLockedUntil: lock
            ? new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000)
            : null,
          // On lockout, invalidate the code so a new one must be requested.
          ...(lock ? { mobileOtpHash: null, mobileOtpExpiresAt: null } : {}),
        },
      });
      throw new BadRequestException('Invalid or expired OTP code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mobileVerified: true,
        mobileOtpHash: null,
        mobileOtpExpiresAt: null,
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
      },
    });

    return { success: true };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; role: string };
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash, revoked: false },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(payload.sub, payload.role, false);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }

  private async issueTokens(userId: string, role: string, rememberMe: boolean) {
    const payload = { sub: userId, role };
    const accessToken: string = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    } as JwtSignOptions);

    const refreshExpiresIn = rememberMe
      ? this.config.get<string>('JWT_REFRESH_EXPIRES_IN_LONG', '30d')
      : this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshExpiryDays = rememberMe ? 30 : 7;

    const refreshToken: string = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
      jwtid: randomUUID(),
    } as JwtSignOptions);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
