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
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { OtpService } from '../../common/otp/otp.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../../common/audit/audit.service';
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
    private settings: SettingsService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot self-register as admin');
    }

    const captchaValid = await this.recaptcha.verify(dto.captchaToken);
    if (!captchaValid) {
      throw new BadRequestException('Captcha verification failed');
    }

    // Field-specific duplicate check so the signup UI can point to the exact field.
    // (Enumeration is acceptable here — the person supplied both values themselves.)
    const [emailTaken, mobileTaken] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { mobile: dto.mobile },
        select: { id: true },
      }),
    ]);
    if (emailTaken && mobileTaken) {
      throw new ConflictException({
        message: 'This email and mobile number are both already registered',
        fields: ['email', 'mobile'],
      });
    }
    if (emailTaken) {
      throw new ConflictException({
        message: 'This email is already registered',
        fields: ['email'],
      });
    }
    if (mobileTaken) {
      throw new ConflictException({
        message: 'This mobile number is already registered',
        fields: ['mobile'],
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomUUID();
    const emailVerificationExpiresAt = new Date();
    emailVerificationExpiresAt.setHours(
      emailVerificationExpiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS,
    );

    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        emailVerificationToken,
        emailVerificationExpiresAt,
        termsAcceptedAt: now,
        consentAt: now,
        marketingOptIn: dto.marketingOptIn ?? false,
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
    const captchaValid = await this.recaptcha.verify(dto.captchaToken);
    if (!captchaValid) {
      throw new BadRequestException('Captcha verification failed');
    }

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
    // Admin 2FA: email OTP challenge before issuing tokens (Settings → Security).
    if (
      user.role === Role.ADMIN &&
      (await this.settings.getBool('ADMIN_2FA_ENABLED', false))
    ) {
      const code = String(randomInt(100000, 1000000));
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          adminOtpHash: createHash('sha256').update(code).digest('hex'),
          adminOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await this.mail.sendAdminLoginOtp(user.email, code);
      return { twoFaRequired: true as const, role: user.role };
    }

    const tokens = await this.issueTokens(
      user.id,
      user.role,
      dto.rememberMe ?? false,
    );
    if (user.role === Role.ADMIN) {
      await this.audit.log('ADMIN_LOGIN', {
        entityType: 'User',
        entityId: user.id,
        summary: `Admin signed in: ${user.email}`,
      });
    }
    return { role: user.role, ...tokens };
  }

  /** Step 2 of admin login: verify password + emailed code, then issue tokens. */
  async loginTwoFa(dto: {
    email: string;
    password: string;
    code: string;
    rememberMe?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const hash = createHash('sha256').update(dto.code.trim()).digest('hex');
    if (
      !user.adminOtpHash ||
      !user.adminOtpExpiresAt ||
      user.adminOtpExpiresAt < new Date() ||
      user.adminOtpHash !== hash
    ) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { adminOtpHash: null, adminOtpExpiresAt: null },
    });
    const tokens = await this.issueTokens(user.id, user.role, dto.rememberMe ?? false);
    await this.audit.log('ADMIN_LOGIN', {
      entityType: 'User',
      entityId: user.id,
      summary: `Admin signed in (2FA): ${user.email}`,
    });
    return { role: user.role, ...tokens };
  }

  async forgotPassword(email: string, captchaToken?: string) {
    const captchaValid = await this.recaptcha.verify(captchaToken);
    if (!captchaValid) {
      throw new BadRequestException('Captcha verification failed');
    }

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

    // Signup gate passed. No session is issued here — the user signs in
    // through /login (single, auditable entry point for sessions).
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

  /**
   * "Continue with Google" (Google Identity Services ID token).
   * Existing account with a verified mobile -> instant sign-in (admins excluded —
   * they must use password + 2FA). Unknown email -> the frontend prefills signup
   * so the user still completes mobile OTP + DPDP consents (no schema shortcut).
   * Token verification is done server-side against Google's tokeninfo endpoint —
   * no extra dependency; aud/iss/email_verified are all checked.
   */
  async googleAuth(credential: string) {
    const clientId = await this.settings.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google sign-in is not enabled');
    }
    let info: {
      aud?: string;
      iss?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
    };
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      );
      if (!res.ok) throw new Error(`tokeninfo ${res.status}`);
      info = (await res.json()) as typeof info;
    } catch {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
    const issOk =
      info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
    const emailVerified =
      info.email_verified === true || info.email_verified === 'true';
    if (info.aud !== clientId || !issOk || !info.email || !emailVerified) {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }

    const user = await this.prisma.user.findUnique({ where: { email: info.email } });
    if (!user) {
      // New to LawMitran — hand back the verified identity for signup prefill.
      return {
        newUser: true as const,
        email: info.email,
        fullName: info.name ?? '',
      };
    }
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts must sign in with password');
    }
    if (!user.mobileVerified) {
      throw new ForbiddenException(
        'Please verify your mobile number to finish signing up',
      );
    }
    if (!user.emailVerified) {
      // Google just proved ownership of this email.
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }
    const tokens = await this.issueTokens(user.id, user.role, false);
    return { newUser: false as const, role: user.role, ...tokens };
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
