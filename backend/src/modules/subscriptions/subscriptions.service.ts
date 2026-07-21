import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { paginate, resolvePagination } from '../../common/pagination';
import { MailService } from '../../common/mail/mail.service';
import { NotifyService } from '../../common/notify/notify.service';
import { AuditService } from '../../common/audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { WhatsappService } from '../../common/whatsapp/whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

const DEFAULT_PLAN_NAME = 'BASIC';
const DEFAULT_DURATION_DAYS = 30;
// Days before end to send renewal reminders (configurable, e.g. RENEWAL_REMINDER_DAYS=30,15,0).
const RENEWAL_REMINDER_DAYS = (process.env.RENEWAL_REMINDER_DAYS ?? '30,15,0')
  .split(',')
  .map((d) => Number(d.trim()))
  .filter((d) => !Number.isNaN(d));

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private mail: MailService,
    private whatsapp: WhatsappService,
    private notify: NotifyService,
    private audit: AuditService,
    private settings: SettingsService,
  ) {}

  private async getLawyerByUserId(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    return lawyer;
  }

  async getMySubscription(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: { lawyerId: lawyer.id },
      orderBy: { startDate: 'desc' },
    });

    return {
      subscriptionStatus: lawyer.subscriptionStatus,
      trialStartDate: lawyer.trialStartDate,
      trialEndDate: lawyer.trialEndDate,
      currentSubscription,
    };
  }

  async createCheckoutOrder(userId: string, dto: ActivateSubscriptionDto) {
    const lawyer = await this.getLawyerByUserId(userId);

    if (lawyer.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      throw new ConflictException('A subscription is already active');
    }

    const planName = dto.planName ?? DEFAULT_PLAN_NAME;
    const durationDays = dto.durationDays ?? DEFAULT_DURATION_DAYS;

    // Price is determined by the (plan, duration) tier — longer terms are discounted.
    const tier = await this.prisma.subscriptionPlanTier.findUnique({
      where: { planName_durationDays: { planName, durationDays } },
    });
    if (!tier || !tier.active) {
      throw new NotFoundException(
        `No active price for plan "${planName}" with duration ${durationDays} days`,
      );
    }

    // Auto-apply the best currently-running offer for this (plan, duration).
    const listAmount = Number(tier.amount);
    const offer = await this.findBestOffer(planName, durationDays, listAmount);
    const finalAmount = offer
      ? this.discountedAmount(listAmount, offer)
      : listAmount;

    const amountInPaise = Math.round(finalAmount * 100);
    // Razorpay caps receipt at 40 chars — keep it short (id slice + base36 time).
    const order = await this.razorpay.createOrder(
      amountInPaise,
      `sub_${lawyer.id.slice(0, 24)}_${Date.now().toString(36)}`,
    );

    const payment = await this.prisma.payment.create({
      data: {
        lawyerId: lawyer.id,
        planName,
        amount: finalAmount,
        listAmount: tier.amount,
        offerId: offer?.id ?? null,
        offerName: offer?.name ?? null,
        durationDays: tier.durationDays,
        providerOrderId: order.id,
        status: PaymentStatus.CREATED,
      },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: (await this.razorpay.getKeyId()) ?? null,
      offer: offer
        ? { id: offer.id, name: offer.name, listAmount, finalAmount }
        : null,
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const lawyer = await this.getLawyerByUserId(userId);

    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: dto.razorpayOrderId },
    });
    if (!payment || payment.lawyerId !== lawyer.id) {
      throw new ForbiddenException(
        'This payment does not belong to your account',
      );
    }
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('This payment has already been processed');
    }

    const verified = await this.razorpay.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!verified) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      await this.notify.notifyAdmins('PAYMENT_FAILED', {
        title: `Payment failed: ${lawyer.fullName} — ${payment.planName}`,
        body: `Signature verification failed for order ${payment.providerOrderId}. Amount ₹${payment.amount}.`,
        link: '/admin/transactions',
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + payment.durationDays);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          lawyerId: lawyer.id,
          planName: payment.planName,
          amount: payment.amount,
          startDate,
          endDate,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      this.prisma.lawyer.update({
        where: { id: lawyer.id },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: dto.razorpayPaymentId,
        },
      }),
    ]);

    await this.notify.notifyAdmins('SUBSCRIPTION_PURCHASED', {
      title: `${lawyer.fullName} purchased ${payment.planName}`,
      body:
        lawyer.verificationStatus === 'APPROVED'
          ? 'Subscription active.'
          : 'Paid while pending — now in the priority review queue.',
      link: `/admin/approvals/${lawyer.id}`,
    });

    return subscription;
  }

  async cancel(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { lawyerId: lawyer.id, status: SubscriptionStatus.ACTIVE },
      orderBy: { startDate: 'desc' },
    });
    if (!activeSubscription) {
      throw new BadRequestException('No active subscription to cancel');
    }

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      }),
      this.prisma.lawyer.update({
        where: { id: lawyer.id },
        data: { subscriptionStatus: SubscriptionStatus.CANCELLED },
      }),
    ]);

    return subscription;
  }

  listPlanPrices() {
    return this.prisma.subscriptionPlanPrice.findMany({
      orderBy: { planName: 'asc' },
    });
  }

  setPlanPrice(
    planName: string,
    amount: number,
    monthlyLeadCap?: number | null,
    maxServiceAreas?: number | null,
  ) {
    return this.prisma.subscriptionPlanPrice.upsert({
      where: { planName },
      create: {
        planName,
        amount,
        monthlyLeadCap: monthlyLeadCap ?? null,
        maxServiceAreas: maxServiceAreas ?? null,
      },
      update: {
        amount,
        ...(monthlyLeadCap !== undefined ? { monthlyLeadCap } : {}),
        ...(maxServiceAreas !== undefined ? { maxServiceAreas } : {}),
      },
    });
  }

  /**
   * Public: all active duration tiers, for rendering the pricing page.
   * Each tier carries the best currently-running offer (if any) and the
   * resulting discounted price, so the frontend can render strikethroughs.
   */
  async listPlanTiers() {
    const [tiers, offers] = await Promise.all([
      this.prisma.subscriptionPlanTier.findMany({
        where: { active: true },
        orderBy: [{ planName: 'asc' }, { durationDays: 'asc' }],
      }),
      this.activeOffers(),
    ]);

    return tiers.map((tier) => {
      const listAmount = Number(tier.amount);
      const offer = this.bestOfferFor(
        offers,
        tier.planName,
        tier.durationDays,
        listAmount,
      );
      return {
        ...tier,
        offer: offer
          ? {
              id: offer.id,
              name: offer.name,
              description: offer.description,
              discountType: offer.discountType,
              discountValue: Number(offer.discountValue),
              endsAt: offer.endsAt,
            }
          : null,
        offerAmount: offer ? this.discountedAmount(listAmount, offer) : null,
      };
    });
  }

  /** Admin: every tier, including inactive ones. */
  listAllPlanTiers() {
    return this.prisma.subscriptionPlanTier.findMany({
      orderBy: [{ planName: 'asc' }, { durationDays: 'asc' }],
    });
  }

  /** Admin: add a new duration tier for a plan (fails if it already exists). */
  async createPlanTier(
    planName: string,
    data: {
      durationDays: number;
      amount: number;
      label?: string;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.subscriptionPlanTier.findUnique({
      where: {
        planName_durationDays: {
          planName,
          durationDays: data.durationDays,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A ${data.durationDays}-day tier already exists for ${planName} — edit it instead`,
      );
    }
    return this.prisma.subscriptionPlanTier.create({
      data: {
        planName,
        durationDays: data.durationDays,
        label:
          data.label ??
          this.defaultLabelForDuration(data.durationDays) ??
          `${data.durationDays} days`,
        amount: data.amount,
        active: data.active ?? true,
      },
    });
  }

  /** Admin: remove a duration tier (past payments keep their own copies of price). */
  async deletePlanTier(planName: string, durationDays: number) {
    await this.prisma.subscriptionPlanTier.delete({
      where: { planName_durationDays: { planName, durationDays } },
    });
    return { deleted: true };
  }

  // ------------------------- Offers -------------------------

  /** Admin: all offers, newest first. */
  listOffers() {
    return this.prisma.offer.findMany({ orderBy: { startsAt: 'desc' } });
  }

  createOffer(dto: CreateOfferDto) {
    this.assertOfferValid(dto);
    return this.prisma.offer.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        discountType: dto.discountType ?? 'PERCENT',
        discountValue: dto.discountValue,
        planName: dto.planName ?? null,
        durationDays: dto.durationDays ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        active: dto.active ?? true,
      },
    });
  }

  async updateOffer(id: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Offer not found');
    this.assertOfferValid({
      discountType: dto.discountType ?? offer.discountType,
      discountValue: dto.discountValue ?? Number(offer.discountValue),
      startsAt: dto.startsAt ?? offer.startsAt.toISOString(),
      endsAt: dto.endsAt ?? offer.endsAt.toISOString(),
    });
    return this.prisma.offer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.discountType !== undefined
          ? { discountType: dto.discountType }
          : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.planName !== undefined
          ? { planName: dto.planName || null }
          : {}),
        ...(dto.durationDays !== undefined
          ? { durationDays: dto.durationDays || null }
          : {}),
        ...(dto.startsAt !== undefined
          ? { startsAt: new Date(dto.startsAt) }
          : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteOffer(id: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Offer not found');
    // Keep payment history intact — detach instead of blocking on FK.
    await this.prisma.offer.delete({ where: { id } });
    return { deleted: true };
  }

  private assertOfferValid(dto: {
    discountType?: 'PERCENT' | 'FLAT';
    discountValue: number;
    startsAt: string;
    endsAt: string;
  }) {
    if (
      (dto.discountType ?? 'PERCENT') === 'PERCENT' &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException('Percent discount cannot exceed 100');
    }
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private activeOffers() {
    const now = new Date();
    return this.prisma.offer.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    });
  }

  /** Best (largest saving) running offer for a (plan, duration) at a given price. */
  private async findBestOffer(
    planName: string,
    durationDays: number,
    listAmount: number,
  ) {
    const offers = await this.activeOffers();
    return this.bestOfferFor(offers, planName, durationDays, listAmount);
  }

  private bestOfferFor<
    T extends {
      planName: string | null;
      durationDays: number | null;
      discountType: string;
      discountValue: unknown;
    },
  >(offers: T[], planName: string, durationDays: number, listAmount: number) {
    const applicable = offers.filter(
      (o) =>
        (o.planName === null || o.planName === planName) &&
        (o.durationDays === null || o.durationDays === durationDays),
    );
    if (applicable.length === 0) return null;
    return applicable.reduce((best, o) =>
      this.discountedAmount(listAmount, o) <
      this.discountedAmount(listAmount, best)
        ? o
        : best,
    );
  }

  private discountedAmount(
    listAmount: number,
    offer: { discountType: string; discountValue: unknown },
  ): number {
    const value = Number(offer.discountValue);
    const discounted =
      offer.discountType === 'FLAT'
        ? listAmount - value
        : listAmount * (1 - value / 100);
    return Math.max(0, Math.round(discounted * 100) / 100);
  }

  /** Admin: create or update the price/label/active flag for a (plan, duration) tier. */
  setPlanTier(
    planName: string,
    durationDays: number,
    data: { amount: number; label?: string; active?: boolean },
  ) {
    const label =
      data.label ??
      this.defaultLabelForDuration(durationDays) ??
      `${durationDays} days`;
    return this.prisma.subscriptionPlanTier.upsert({
      where: { planName_durationDays: { planName, durationDays } },
      create: {
        planName,
        durationDays,
        label,
        amount: data.amount,
        active: data.active ?? true,
      },
      update: {
        amount: data.amount,
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  private defaultLabelForDuration(durationDays: number): string | undefined {
    return {
      30: '30 days',
      90: '3 months',
      180: '6 months',
      365: '1 year',
    }[durationDays];
  }

  async expireDueSubscriptions() {
    const now = new Date();

    const expiredTrials = await this.prisma.lawyer.updateMany({
      where: {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndDate: { lt: now },
      },
      data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
    });

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, endDate: { lt: now } },
      select: { id: true, lawyerId: true },
    });

    if (dueSubscriptions.length > 0) {
      const lawyerIds = [...new Set(dueSubscriptions.map((s) => s.lawyerId))];
      await this.prisma.$transaction([
        this.prisma.subscription.updateMany({
          where: { id: { in: dueSubscriptions.map((s) => s.id) } },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.lawyer.updateMany({
          where: {
            id: { in: lawyerIds },
            subscriptionStatus: SubscriptionStatus.ACTIVE,
          },
          data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
        }),
      ]);
    }

    return {
      trialsExpired: expiredTrials.count,
      subscriptionsExpired: dueSubscriptions.length,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiryCron() {
    await this.expireDueSubscriptions();
  }

  /**
   * Renewal reminders: for each configured offset (default 30, 15, and 0 days before end), notify
   * lawyers whose paid subscription — or free trial — ends that day, over email + WhatsApp.
   * Runs daily; each subscription matches a given offset on exactly one calendar day, so no dedupe needed.
   */
  async sendRenewalReminders() {
    let sent = 0;
    for (const daysLeft of RENEWAL_REMINDER_DAYS) {
      const { start, end } = this.dayWindowFromNow(daysLeft);

      // Paid subscriptions ending on that day
      const subs = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: start, lt: end },
        },
        select: {
          lawyer: {
            select: { user: { select: { email: true, mobile: true } } },
          },
        },
      });
      for (const s of subs) {
        await this.notifyRenewal(s.lawyer.user, daysLeft, 'subscription');
        sent++;
      }

      // Free trials ending on that day
      const trials = await this.prisma.lawyer.findMany({
        where: {
          subscriptionStatus: SubscriptionStatus.TRIAL,
          trialEndDate: { gte: start, lt: end },
        },
        select: { user: { select: { email: true, mobile: true } } },
      });
      for (const l of trials) {
        await this.notifyRenewal(l.user, daysLeft, 'trial');
        sent++;
      }
    }
    return { remindersSent: sent };
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleRenewalReminderCron() {
    await this.sendRenewalReminders();
  }

  private dayWindowFromNow(daysFromNow: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + daysFromNow);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async notifyRenewal(
    user: { email: string; mobile: string },
    daysLeft: number,
    kind: 'subscription' | 'trial',
  ) {
    const what = kind === 'trial' ? 'free trial' : 'LawMitran subscription';
    const subject =
      daysLeft <= 0
        ? `Your ${what} has ended — renew to keep receiving leads`
        : `Your ${what} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    const action =
      daysLeft <= 0
        ? `Renew now to become visible again and unlock client contacts.`
        : `Renew before it ends to avoid any interruption to your leads.`;
    const body = `${subject}. ${action}`;

    await this.mail.sendSubscriptionReminder(user.email, subject, body);
    await this.whatsapp.sendMessage(user.mobile, body);
  }

  // ---- Admin: transactions (docs/10 P1) ----

  async adminListPayments(
    status?: string,
    q?: string,
    page?: string | number,
    pageSize?: string | number,
  ) {
    const query = q?.trim();
    const where: Prisma.PaymentWhereInput = {
      ...(status && status !== 'ALL'
        ? { status: status as PaymentStatus }
        : {}),
      ...(query
        ? {
            OR: [
              { providerOrderId: { contains: query, mode: 'insensitive' } },
              { providerPaymentId: { contains: query, mode: 'insensitive' } },
              {
                lawyer: {
                  is: { fullName: { contains: query, mode: 'insensitive' } },
                },
              },
              {
                lawyer: {
                  is: {
                    user: {
                      is: { email: { contains: query, mode: 'insensitive' } },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const pg = resolvePagination(page, pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.take,
        include: {
          lawyer: {
            select: {
              id: true,
              fullName: true,
              user: { select: { email: true, mobile: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
  }

  /** Manual reconcile: admin confirmed the money arrived (e.g. via the Razorpay dashboard). */
  async adminMarkPaymentPaid(
    adminUserId: string,
    paymentId: string,
    note?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lawyer: { select: { id: true, fullName: true, userId: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment is already marked paid');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + payment.durationDays);

    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID },
      }),
      this.prisma.subscription.create({
        data: {
          lawyerId: payment.lawyerId,
          planName: payment.planName,
          amount: payment.amount,
          startDate,
          endDate,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      this.prisma.lawyer.update({
        where: { id: payment.lawyerId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
    ]);

    await this.audit.log('PAYMENT_MARKED_PAID', {
      entityType: 'Payment',
      entityId: payment.id,
      summary: `Marked ${payment.planName} order ${payment.providerOrderId} (₹${payment.amount}) paid for ${payment.lawyer.fullName}${note ? ` — ${note}` : ''}`,
      oldValue: { status: payment.status },
      newValue: { status: 'PAID', note: note ?? null },
    });
    await this.notify.notifyAdmins('PAYMENT_RECONCILED', {
      title: `Payment manually marked paid: ${payment.lawyer.fullName}`,
      body: `${payment.planName} · order ${payment.providerOrderId}${note ? ` — note: ${note}` : ''} (by admin ${adminUserId}).`,
      link: '/admin/transactions',
    });
    await this.notify.notifyUser(payment.lawyer.userId, 'SUB_ACTIVE', {
      title: 'Subscription activated',
      body: `Your ${payment.planName} plan is now active.`,
    });

    return updated;
  }

  /** GST invoice payload; assigns a sequential invoice number on first call. */
  async adminGetInvoice(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lawyer: {
          select: {
            fullName: true,
            barCouncilState: true,
            user: { select: { email: true, mobile: true } },
            offices: {
              where: { isPrimary: true },
              select: {
                addressLine: true,
                landmark: true,
                pincode: true,
                city: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Invoices are available only for paid transactions',
      );
    }

    let invoiceNo = payment.invoiceNo;
    if (!invoiceNo) {
      const prefix = (await this.settings.get('INVOICE_PREFIX')) || 'LM';
      const year = new Date(payment.createdAt).getFullYear();
      // Low-volume sequential numbering; the unique index guards against races.
      for (let attempt = 0; attempt < 3 && !invoiceNo; attempt++) {
        const seq =
          (await this.prisma.payment.count({
            where: { invoiceNo: { not: null } },
          })) +
          1 +
          attempt;
        const candidate = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
        try {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { invoiceNo: candidate },
          });
          invoiceNo = candidate;
        } catch {
          /* unique collision — retry with next number */
        }
      }
      if (!invoiceNo) {
        throw new BadRequestException(
          'Could not assign an invoice number — try again',
        );
      }
      await this.audit.log('INVOICE_GENERATED', {
        entityType: 'Payment',
        entityId: payment.id,
        summary: `Invoice ${invoiceNo} for ${payment.lawyer.fullName} — ${payment.planName} ₹${payment.amount}`,
        newValue: { invoiceNo },
      });
    }

    const rate = await this.settings.getNumber('GST_RATE', 18);
    const gross = Number(payment.amount);
    const taxable = Math.round((gross / (1 + rate / 100)) * 100) / 100;
    const tax = Math.round((gross - taxable) * 100) / 100;
    const office = payment.lawyer.offices[0];

    return {
      invoiceNo,
      date: payment.updatedAt,
      seller: {
        name: (await this.settings.get('GST_LEGAL_NAME')) || 'LawMitran',
        gstin: (await this.settings.get('GSTIN')) || null,
        address: (await this.settings.get('GST_ADDRESS')) || null,
      },
      buyer: {
        name: payment.lawyer.fullName,
        email: payment.lawyer.user.email,
        mobile: payment.lawyer.user.mobile,
        address: office
          ? [
              office.addressLine,
              office.landmark,
              office.city?.name,
              office.pincode,
            ]
              .filter(Boolean)
              .join(', ')
          : null,
        state: payment.lawyer.barCouncilState,
      },
      item: {
        description: `${payment.planName} subscription — ${payment.durationDays} days`,
        offerName: payment.offerName,
        listAmount: payment.listAmount ? Number(payment.listAmount) : null,
      },
      taxableValue: taxable,
      gstRate: rate,
      gstAmount: tax,
      total: gross,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
    };
  }
}
