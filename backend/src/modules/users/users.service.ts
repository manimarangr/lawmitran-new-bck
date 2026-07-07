import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OtpService } from '../../common/otp/otp.service';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private otp: OtpService,
    private storage: StorageService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        mobileVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ---------- Settings ----------

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // sign out other sessions
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ]);
    return { message: 'Password updated. Please sign in again on other devices.' };
  }

  /** Step 1 of change-mobile: send an OTP to the NEW number. */
  async requestMobileChange(userId: string, newMobile: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (newMobile === user.mobile) {
      throw new BadRequestException('This is already your mobile number');
    }
    const taken = await this.prisma.user.findUnique({
      where: { mobile: newMobile },
      select: { id: true },
    });
    if (taken) throw new ConflictException('This mobile number is already in use');

    if (user.mobileOtpLastSentAt) {
      const elapsed = (Date.now() - user.mobileOtpLastSentAt.getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code`,
        );
      }
    }

    const code = this.otp.generateCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingMobile: newMobile,
        mobileOtpHash: this.otp.hash(code),
        mobileOtpExpiresAt: new Date(Date.now() + this.otp.ttlMs),
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
        mobileOtpLastSentAt: new Date(),
      },
    });
    const channel = await this.otp.deliver(newMobile, code);
    return { success: true, channel };
  }

  /** Step 2: verify the OTP and switch the number. */
  async verifyMobileChange(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pendingMobile) {
      throw new BadRequestException('No mobile change in progress');
    }
    if (user.mobileOtpLockedUntil && user.mobileOtpLockedUntil > new Date()) {
      throw new ForbiddenException('Too many attempts. Request a new code shortly.');
    }
    if (!user.mobileOtpHash || !user.mobileOtpExpiresAt || user.mobileOtpExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    if (user.mobileOtpHash !== this.otp.hash(code)) {
      const attempts = user.mobileOtpAttempts + 1;
      const lock = attempts >= OTP_MAX_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          mobileOtpAttempts: attempts,
          mobileOtpLockedUntil: lock ? new Date(Date.now() + OTP_LOCK_MINUTES * 60_000) : null,
          ...(lock ? { mobileOtpHash: null, mobileOtpExpiresAt: null } : {}),
        },
      });
      throw new BadRequestException('Invalid or expired OTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mobile: user.pendingMobile,
        mobileVerified: true,
        pendingMobile: null,
        mobileOtpHash: null,
        mobileOtpExpiresAt: null,
        mobileOtpAttempts: 0,
        mobileOtpLockedUntil: null,
      },
    });
    return { success: true };
  }

  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image uploaded');
    const avatarUrl = await this.storage.upload(file, 'avatars');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { avatarUrl };
  }

  /** Soft delete — status DELETED, revoke sessions. Records are retained for legal/audit reasons. */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.DELETED, deletedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ]);
    return { message: 'Your account has been deleted.' };
  }

  // ---------- Notifications ----------

  listNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) throw new ForbiddenException('Not your notification');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  // ---------- Reports (two-sided) ----------

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    const reported = await this.prisma.user.findUnique({
      where: { id: dto.reportedUserId },
      select: { id: true },
    });
    if (!reported) throw new NotFoundException('Reported user not found');

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        leadId: dto.leadId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  adminListReports(status?: ReportStatus) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, email: true, role: true } },
        reportedUser: { select: { id: true, email: true, role: true, status: true } },
      },
    });
  }

  async adminReviewReport(adminId: string, id: string, dto: ReviewReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: `REPORT_${dto.status}`,
        entity: 'Report',
        entityId: id,
        metaJson: { reportedUserId: report.reportedUserId },
      },
    });

    if (dto.status === ReportStatus.ACTIONED && dto.suspendReportedUser) {
      await this.prisma.user.update({
        where: { id: report.reportedUserId },
        data: { status: UserStatus.SUSPENDED },
      });
      await this.prisma.refreshToken.updateMany({
        where: { userId: report.reportedUserId, revoked: false },
        data: { revoked: true },
      });
    }
    return { success: true };
  }
}
