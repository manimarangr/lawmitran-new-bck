import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../common/mail/mail.service';
import { OtpService } from '../../common/otp/otp.service';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let recaptcha: { verify: jest.Mock };
  let mail: { sendEmailVerification: jest.Mock };
  let otp: {
    generateCode: jest.Mock;
    hash: jest.Mock;
    deliver: jest.Mock;
    ttlMs: number;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    recaptcha = { verify: jest.fn().mockResolvedValue(true) };
    mail = { sendEmailVerification: jest.fn().mockResolvedValue(undefined) };
    otp = {
      generateCode: jest.fn().mockReturnValue('123456'),
      hash: jest.fn((code: string) => `hash:${code}`),
      deliver: jest.fn().mockResolvedValue('whatsapp'),
      ttlMs: 5 * 60 * 1000,
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token'),
            verify: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RecaptchaService, useValue: recaptcha },
        { provide: MailService, useValue: mail },
        { provide: OtpService, useValue: otp },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('rejects captcha failure before touching the database', async () => {
      recaptcha.verify.mockResolvedValue(false);

      await expect(
        service.register({
          email: 'a@b.com',
          mobile: '9999999999',
          password: 'password123',
          role: Role.CLIENT,
          captchaToken: 'bad-token',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('sends one mobile OTP and an email link for a CLIENT', async () => {
      // duplicate check (email, mobile) → both free; then sendMobileOtp re-reads the user
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          id: 'user-1',
          mobile: '9999999999',
          mobileVerified: false,
        });
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        mobile: '9999999999',
        role: Role.CLIENT,
      });

      const result = await service.register({
        email: 'a@b.com',
        mobile: '9999999999',
        password: 'password123',
        role: Role.CLIENT,
        captchaToken: 'good-token',
      });

      expect(result).toEqual({
        userId: 'user-1',
        mobileVerificationRequired: true,
        emailVerificationRequired: false,
      });
      expect(mail.sendEmailVerification).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
      expect(otp.deliver).toHaveBeenCalledWith('9999999999', '123456');
    });

    it('sends a mobile OTP for a LAWYER too', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          id: 'user-2',
          mobile: '9999999998',
          mobileVerified: false,
        });
      prisma.user.create.mockResolvedValue({
        id: 'user-2',
        email: 'lawyer@b.com',
        mobile: '9999999998',
        role: Role.LAWYER,
      });

      const result = await service.register({
        email: 'lawyer@b.com',
        mobile: '9999999998',
        password: 'password123',
        role: Role.LAWYER,
        captchaToken: 'good-token',
      });

      expect(result.mobileVerificationRequired).toBe(true);
      expect(otp.deliver).toHaveBeenCalledWith('9999999998', '123456');
    });

    it('rejects a duplicate email with a field-specific 409', async () => {
      // email taken, mobile free
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);

      await expect(
        service.register({
          email: 'taken@b.com',
          mobile: '9999999997',
          password: 'password123',
          role: Role.CLIENT,
          captchaToken: 'good-token',
        }),
      ).rejects.toMatchObject({
        response: { fields: ['email'] },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unverified mobile for any role', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        mobileVerified: false,
        role: Role.CLIENT,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('logs in with a verified mobile even if email is unverified', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        emailVerified: false,
        mobileVerified: true,
        role: Role.CLIENT,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result).toEqual({ accessToken: 'token', refreshToken: 'token' });
    });
  });

  describe('verifyEmail', () => {
    it('rejects an unknown or expired token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks the email verified and clears the token', async () => {
      const future = new Date(Date.now() + 60_000);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerificationExpiresAt: future,
      });

      await service.verifyEmail('good-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
    });
  });

  describe('sendMobileOtp / verifyMobileOtp', () => {
    it('sends an OTP for a client account (WhatsApp-first)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mobile: '9999999999',
        mobileVerified: false,
        mobileOtpLastSentAt: null,
      });

      const result = await service.sendMobileOtp('9999999999');

      expect(result).toEqual({ success: true, channel: 'whatsapp' });
      expect(otp.deliver).toHaveBeenCalledWith('9999999999', '123456');
    });

    it('rejects sending an OTP when already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mobileVerified: true,
      });

      await expect(service.sendMobileOtp('9999999999')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throttles a too-soon resend', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mobileVerified: false,
        mobileOtpLastSentAt: new Date(), // just now
      });

      await expect(service.sendMobileOtp('9999999999')).rejects.toThrow(
        BadRequestException,
      );
      expect(otp.deliver).not.toHaveBeenCalled();
    });

    it('rejects an incorrect OTP code and counts the attempt', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mobileVerified: false,
        mobileOtpHash: 'hash:123456',
        mobileOtpExpiresAt: new Date(Date.now() + 60_000),
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
      });

      await expect(
        service.verifyMobileOtp('9999999999', '000000'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mobileOtpAttempts: 1 }),
        }),
      );
    });

    it('marks the mobile verified on a correct code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mobileVerified: false,
        mobileOtpHash: 'hash:123456',
        mobileOtpExpiresAt: new Date(Date.now() + 60_000),
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
      });

      await service.verifyMobileOtp('9999999999', '123456');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mobileVerified: true,
          mobileOtpHash: null,
          mobileOtpExpiresAt: null,
          mobileOtpAttempts: 0,
          mobileOtpLockedUntil: null,
        },
      });
    });
  });
});
