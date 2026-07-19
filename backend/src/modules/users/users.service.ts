import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactQueryStatus,
  PaymentStatus,
  ReportStatus,
  Role,
  SubscriptionStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OtpService } from '../../common/otp/otp.service';
import { paginate, resolvePagination } from '../../common/pagination';
import { StorageService } from '../../common/storage/storage.service';
import { NotifyService } from '../../common/notify/notify.service';
import { AuditService } from '../../common/audit/audit.service';
import { MailService } from '../../common/mail/mail.service';
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
    private notify: NotifyService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mobile: true,
        fullName: true,
        role: true,
        adminRole: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        mobileVerified: true,
        marketingOptIn: true,
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
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Profile picture must be an image (JPG/PNG/WebP)');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Photo is too large — maximum size is 2 MB');
    }
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
    let reportedUserId = dto.reportedUserId;

    // Resolve the counterparty from the lead if not given directly.
    if (!reportedUserId) {
      if (!dto.leadId) {
        throw new BadRequestException('reportedUserId or leadId is required');
      }
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
        include: { lawyer: { select: { userId: true } } },
      });
      if (!lead) throw new NotFoundException('Lead not found');
      if (lead.clientId === reporterId) {
        reportedUserId = lead.lawyer.userId; // client reports the lawyer
      } else if (lead.lawyer.userId === reporterId) {
        reportedUserId = lead.clientId; // lawyer reports the client
      } else {
        throw new ForbiddenException('You were not party to this lead');
      }
    }

    if (reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    const reported = await this.prisma.user.findUnique({
      where: { id: reportedUserId },
      select: { id: true },
    });
    if (!reported) throw new NotFoundException('Reported user not found');

    await this.notify.notifyAdmins('REPORT_FILED', {
      title: 'New moderation report',
      body: `Reason: ${dto.reason.replace(/_/g, ' ').toLowerCase()}`,
      link: '/admin/moderation',
    });

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        leadId: dto.leadId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  // ---------- Admin: user management ----------

  /** Onboarding funnel: where lawyer signups stall (docs/10). */
  async adminOnboardingFunnel() {
    const [signups, otpVerified, submitted, approved, subscribed] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { role: Role.LAWYER } }),
        this.prisma.user.count({ where: { role: Role.LAWYER, mobileVerified: true } }),
        this.prisma.lawyer.count(),
        this.prisma.lawyer.count({
          where: { verificationStatus: VerificationStatus.APPROVED },
        }),
        this.prisma.lawyer.count({
          where: { subscriptionStatus: SubscriptionStatus.ACTIVE },
        }),
      ]);
    return { signups, otpVerified, submitted, approved, subscribed };
  }

  /** Nudge every lawyer who signed up but never submitted a profile. */
  async nudgeAwaitingOnboarding() {
    const stalled = await this.prisma.user.findMany({
      where: { role: Role.LAWYER, lawyer: null, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });
    for (const u of stalled) {
      await this.mail.sendOnboardingNudge(u.email);
      await this.notify.notifyUser(u.id, 'ONBOARDING_NUDGE', {
        title: 'Complete your lawyer profile',
        body: 'Submit your Bar details and ID card to get verified and start receiving client leads.',
      });
    }
    await this.audit.log('ONBOARDING_NUDGE_SENT', {
      entityType: 'User',
      summary: `Nudged ${stalled.length} lawyer signup(s) awaiting onboarding`,
    });
    return { nudged: stalled.length };
  }

  /** Admin dashboard snapshot (docs/10). */
  async adminOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);

    const [
      pendingLawyers,
      awaitingOnboarding,
      approvedLawyers,
      openQueries,
      openReports,
      failedPayments30d,
      activeSubscriptions,
      trialsEndingSoon,
      newLeads7d,
      revenue,
      docRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.lawyer.count({
        where: {
          verificationStatus: {
            in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
          },
        },
      }),
      this.prisma.user.count({ where: { role: Role.LAWYER, lawyer: null } }),
      this.prisma.lawyer.count({
        where: { verificationStatus: VerificationStatus.APPROVED },
      }),
      this.prisma.contactQuery.count({
        where: { status: ContactQueryStatus.OPEN },
      }),
      this.prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED, createdAt: { gte: d30 } },
      }),
      this.prisma.lawyer.count({
        where: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.lawyer.count({
        where: {
          subscriptionStatus: SubscriptionStatus.TRIAL,
          verificationStatus: VerificationStatus.APPROVED,
          trialEndDate: { gte: now, lte: in7 },
        },
      }),
      this.prisma.lead.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID, createdAt: { gte: monthStart } },
      }),
      // Document marketplace revenue: purchases that completed payment this month.
      this.prisma.customerDocument.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['PAID', 'DELIVERED'] as never[] },
          updatedAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      pendingLawyers,
      awaitingOnboarding,
      approvedLawyers,
      openQueries,
      openReports,
      failedPayments30d,
      activeSubscriptions,
      trialsEndingSoon,
      newLeads7d,
      revenueThisMonth:
        Number(revenue._sum.amount ?? 0) + Number(docRevenue._sum.amount ?? 0),
      subscriptionRevenueThisMonth: revenue._sum.amount ?? 0,
      documentRevenueThisMonth: docRevenue._sum.amount ?? 0,
    };
  }

  async adminListUsers(
    role?: string,
    status?: UserStatus,
    q?: string,
    sort?: string,
    page?: string | number,
    pageSize?: string | number,
  ) {
    const query = q?.trim();
    const where = {
      // Lawyers are managed under the admin Lawyers tab; exclude them by default.
      ...(role ? { role: role as never } : { role: { not: Role.LAWYER } }),
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' as const } },
              { mobile: { contains: query } },
              { fullName: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const pg = resolvePagination(page, pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          mobile: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy:
          sort === 'name'
            ? { fullName: 'asc' }
            : sort === 'mobile'
              ? { mobile: 'asc' }
              : sort === 'status'
                ? { status: 'asc' }
                : { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
  }

  /** Admin: create a client/lawyer account, or (SUPER only) a staff admin. */
  async adminCreateUser(
    dto: {
      fullName: string;
      email: string;
      mobile: string;
      role: 'CLIENT' | 'LAWYER' | 'ADMIN';
      adminRole?: 'SUPER' | 'OPS' | 'FINANCE';
      password?: string;
    },
    actorUserId?: string,
  ) {
    if (dto.role === 'ADMIN') {
      const actor = actorUserId
        ? await this.prisma.user.findUnique({
            where: { id: actorUserId },
            select: { role: true, adminRole: true },
          })
        : null;
      if (
        !actor ||
        actor.role !== Role.ADMIN ||
        (actor.adminRole ?? 'SUPER') !== 'SUPER'
      ) {
        throw new ForbiddenException(
          'Only a SUPER admin can create staff admin accounts',
        );
      }
    }
    await this.assertEmailMobileFree(dto.email, dto.mobile);
    const tempPassword = dto.password ?? this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        mobile: dto.mobile,
        passwordHash,
        role: dto.role as Role,
        ...(dto.role === 'ADMIN'
          ? { adminRole: (dto.adminRole ?? 'OPS') as never }
          : {}),
        status: UserStatus.ACTIVE,
        emailVerified: true,
        mobileVerified: true,
      },
      select: { id: true, email: true, mobile: true, fullName: true, role: true, status: true, createdAt: true },
    });
    await this.audit.log('USER_CREATED', {
      entityType: 'User',
      entityId: user.id,
      summary: `Created ${dto.role}${dto.role === 'ADMIN' ? ` (${dto.adminRole ?? 'OPS'})` : ''} account ${user.email}`,
      newValue: { email: user.email, mobile: user.mobile, role: dto.role },
    });
    // Returned exactly once — the admin shares it with the user, who should change it.
    return { user, tempPassword: dto.password ? undefined : tempPassword };
  }

  /** Admin: edit name/email/mobile (admins cannot be edited here). */
  async adminUpdateUser(
    id: string,
    dto: { fullName?: string; email?: string; mobile?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be edited here');
    }
    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
      if (taken) throw new ConflictException('This email is already registered');
    }
    if (dto.mobile && dto.mobile !== user.mobile) {
      const taken = await this.prisma.user.findUnique({ where: { mobile: dto.mobile }, select: { id: true } });
      if (taken) throw new ConflictException('This mobile number is already registered');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
      },
      select: { id: true, email: true, mobile: true, fullName: true, role: true, status: true, createdAt: true },
    });
    await this.audit.log('USER_UPDATED', {
      entityType: 'User',
      entityId: id,
      summary: `Edited account ${user.email}`,
      oldValue: { fullName: user.fullName, email: user.email, mobile: user.mobile },
      newValue: { fullName: updated.fullName, email: updated.email, mobile: updated.mobile },
    });
    return updated;
  }

  /** Admin: reset a user's password to a one-time temporary value; revokes sessions. */
  async adminResetPassword(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Reset admin passwords via the environment/seed');
    }
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      }),
    ]);
    await this.audit.log('USER_PASSWORD_RESET', {
      entityType: 'User',
      entityId: id,
      summary: `Reset password for ${user.email} (sessions revoked)`,
    });
    return { tempPassword };
  }

  private async assertEmailMobileFree(email: string, mobile: string) {
    const [emailTaken, mobileTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { mobile }, select: { id: true } }),
    ]);
    if (emailTaken) throw new ConflictException('This email is already registered');
    if (mobileTaken) throw new ConflictException('This mobile number is already registered');
  }

  private generateTempPassword(): string {
    // 12 chars, unambiguous alphabet + required classes
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(10);
    let pw = '';
    for (const b of bytes) pw += alphabet[b % alphabet.length];
    return `Lm${pw}!`;
  }

  async adminSetUserStatus(id: string, status: UserStatus) {
    const before = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, status: true },
    });
    if (!before) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { status } });
    await this.audit.log(`USER_${status}`, {
      entityType: 'User',
      entityId: id,
      summary: `${before.email}: ${before.status} → ${status}`,
      oldValue: { status: before.status },
      newValue: { status },
    });
    if (status !== UserStatus.ACTIVE) {
      // suspended/deleted → revoke sessions
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });
    }
    return { success: true };
  }

  /** DPDP: full personal-data export for a user (consent records included). */
  async adminExportUserData(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        fullName: true,
        role: true,
        status: true,
        avatarUrl: true,
        emailVerified: true,
        mobileVerified: true,
        termsAcceptedAt: true,
        consentAt: true,
        marketingOptIn: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const propertyCases = await this.prisma.propertyCase.findMany({
      where: { userId: id },
      include: { documents: true },
    });
    const [lawyer, leadsAsClient, ratings, bookmarks, notifications, reportsFiled, reportsAgainst, contactQueries] =
      await Promise.all([
        this.prisma.lawyer.findUnique({
          where: { userId: id },
          include: {
            practiceAreas: { select: { practiceArea: { select: { name: true } } } },
            languages: { select: { language: { select: { name: true } } } },
            courts: { select: { court: { select: { name: true } } } },
            offices: true,
            serviceAreas: { select: { city: { select: { name: true } }, active: true } },
            payments: {
              select: {
                planName: true, amount: true, status: true, invoiceNo: true,
                providerOrderId: true, createdAt: true,
              },
            },
            subscriptions: true,
            leads: { select: { id: true, practiceArea: true, status: true, createdAt: true } },
            verifications: true,
          },
        }),
        this.prisma.lead.findMany({
          where: { clientId: id },
          select: { id: true, practiceArea: true, description: true, status: true, createdAt: true },
        }),
        this.prisma.rating.findMany({
          where: { clientId: id },
          select: { score: true, comment: true, createdAt: true },
        }),
        this.prisma.bookmark.findMany({ where: { userId: id }, select: { lawyerId: true, createdAt: true } }),
        this.prisma.notification.findMany({
          where: { userId: id },
          select: { type: true, payloadJson: true, readAt: true, createdAt: true },
        }),
        this.prisma.report.findMany({ where: { reporterId: id }, select: { reason: true, status: true, createdAt: true } }),
        this.prisma.report.findMany({ where: { reportedUserId: id }, select: { reason: true, status: true, createdAt: true } }),
        this.prisma.contactQuery.findMany({
          where: { userId: id },
          select: { category: true, subject: true, message: true, status: true, createdAt: true },
        }),
      ]);

    await this.audit.log('USER_DATA_EXPORTED', {
      entityType: 'User',
      entityId: id,
      summary: `Exported personal data for ${user.email} (DPDP request)`,
    });

    return {
      exportedAt: new Date(),
      account: user,
      consent: {
        termsAcceptedAt: user.termsAcceptedAt,
        processingConsentAt: user.consentAt,
        marketingOptIn: user.marketingOptIn,
      },
      lawyerProfile: lawyer,
      leadsAsClient,
      ratingsGiven: ratings,
      bookmarks,
      notifications,
      reportsFiled,
      reportsAgainst,
      contactQueries,
      propertyCases,
    };
  }

  /** DPDP erasure: anonymize PII on a soft-deleted account. Financial records are retained (GST law). */
  async adminEraseUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, status: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be erased here');
    }
    if (user.status !== UserStatus.DELETED) {
      throw new BadRequestException('Soft-delete the account first, then erase its PII');
    }

    const short = id.slice(0, 8);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          fullName: 'Erased User',
          email: `erased-${short}@erased.lawmitran.invalid`,
          mobile: `ERASED${short.toUpperCase()}`,
          avatarUrl: null,
          marketingOptIn: false,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.bookmark.deleteMany({ where: { userId: id } }),
      // Lawyer public identity, if any — profile stays for referential integrity, PII goes.
      this.prisma.lawyer.updateMany({
        where: { userId: id },
        data: { fullName: 'Erased Lawyer', bio: null, profileImageUrl: null },
      }),
    ]);

    await this.audit.log('USER_ERASED', {
      entityType: 'User',
      entityId: id,
      summary: `Erased PII for ${user.email} (DPDP request). Leads/payments retained for legal compliance.`,
    });
    return { erased: true };
  }

  async adminListReports(
    status?: ReportStatus,
    page?: string | number,
    pageSize?: string | number,
  ) {
    const where = status ? { status } : undefined;
    const pg = resolvePagination(page, pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.pageSize,
        include: {
          reporter: { select: { id: true, email: true, role: true } },
          reportedUser: { select: { id: true, email: true, role: true, status: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
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
    await this.audit.log(`REPORT_${dto.status}`, {
      entityType: 'Report',
      entityId: id,
      summary: `Report ${dto.status.toLowerCase()}${dto.suspendReportedUser ? ' + reported user suspended' : ''}${dto.adminNote ? ` — ${dto.adminNote}` : ''}`,
      oldValue: { status: report.status },
      newValue: { status: dto.status, reportedUserId: report.reportedUserId },
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
