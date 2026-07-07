import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadStatus,
  SubscriptionStatus,
  VerificationStatus,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { WhatsappService } from '../../common/whatsapp/whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

const STATUS_ORDER: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.CLOSED,
];

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private whatsapp: WhatsappService,
  ) {}

  async create(clientId: string, dto: CreateLeadDto) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { id: dto.lawyerId },
      include: { user: true },
    });
    if (!lawyer || lawyer.verificationStatus !== VerificationStatus.APPROVED) {
      throw new NotFoundException('Lawyer not found');
    }
    if (lawyer.subscriptionStatus === SubscriptionStatus.EXPIRED) {
      throw new BadRequestException(
        'This lawyer is not currently accepting new leads',
      );
    }

    // Enforce the plan's monthly lead cap (Basic = capped, Premium/Trial = unlimited).
    const cap = await this.getMonthlyLeadCap(
      lawyer.id,
      lawyer.subscriptionStatus,
    );
    if (cap !== null) {
      const used = await this.countLeadsThisMonth(lawyer.id);
      if (used >= cap) {
        throw new BadRequestException(
          'This lawyer has reached their monthly lead capacity. Please choose another available lawyer.',
        );
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        clientId,
        lawyerId: lawyer.id,
        practiceArea: dto.practiceArea,
        description: dto.description,
      },
    });

    await this.mail.sendNewLeadNotification(
      lawyer.user.email,
      dto.practiceArea,
    );
    await this.whatsapp.sendMessage(
      lawyer.user.mobile,
      `New ${dto.practiceArea} lead on LawMitran. Open your dashboard to respond.`,
    );

    return lead;
  }

  listForClient(clientId: string) {
    return this.prisma.lead.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForLawyer(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);
    return this.prisma.lead.findMany({
      where: { lawyerId: lawyer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, leadId: string, dto: UpdateLeadStatusDto) {
    const lawyer = await this.getLawyerByUserId(userId);

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.lawyerId !== lawyer.id) {
      throw new ForbiddenException('You can only update leads assigned to you');
    }

    const currentIndex = STATUS_ORDER.indexOf(lead.status);
    const nextIndex = STATUS_ORDER.indexOf(dto.status);
    if (nextIndex <= currentIndex) {
      throw new BadRequestException(
        `Cannot move lead status from ${lead.status} to ${dto.status}`,
      );
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: dto.status },
    });
  }

  /** Client confirms the lawyer actually reached out (protects conversion metrics from lawyer-asserted contact). */
  async confirmContact(clientId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.clientId !== clientId) {
      throw new ForbiddenException('This lead does not belong to you');
    }
    if (lead.status === LeadStatus.CLOSED) {
      throw new BadRequestException('This lead is already closed');
    }

    const movesToContacted = lead.status !== LeadStatus.CONTACTED;
    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          clientConfirmedAt: new Date(),
          ...(movesToContacted ? { status: LeadStatus.CONTACTED } : {}),
        },
      }),
      this.prisma.leadHistory.create({
        data: {
          leadId,
          fromStatus: lead.status,
          toStatus: movesToContacted ? LeadStatus.CONTACTED : lead.status,
          changedBy: clientId,
          note: 'Client confirmed the lawyer made contact',
        },
      }),
    ]);
    return updated;
  }

  /** Client withdraws their requirement — closes the lead. */
  async withdraw(clientId: string, leadId: string, reason?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.clientId !== clientId) {
      throw new ForbiddenException('This lead does not belong to you');
    }
    if (lead.status === LeadStatus.CLOSED) {
      throw new BadRequestException('This lead is already closed');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.CLOSED, closedReason: reason ?? 'WITHDRAWN' },
      }),
      this.prisma.leadHistory.create({
        data: {
          leadId,
          fromStatus: lead.status,
          toStatus: LeadStatus.CLOSED,
          changedBy: clientId,
          note: reason ? `Withdrawn by client: ${reason}` : 'Withdrawn by client',
        },
      }),
    ]);
    return updated;
  }

  /**
   * Lawyer reveals a lead's client contact — **subscription-gated on the server** (UI gating alone is
   * not enough). Only TRIAL/ACTIVE lawyers may reveal; every reveal is logged for anti-abuse + analytics.
   */
  async revealContact(userId: string, leadId: string) {
    const lawyer = await this.getLawyerByUserId(userId);

    const canReveal =
      lawyer.subscriptionStatus === SubscriptionStatus.TRIAL ||
      lawyer.subscriptionStatus === SubscriptionStatus.ACTIVE;
    if (!canReveal) {
      throw new ForbiddenException(
        'Subscribe to reveal client contact details',
      );
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { client: { select: { mobile: true, email: true } } },
    });
    if (!lead || lead.lawyerId !== lawyer.id) {
      throw new ForbiddenException('This lead does not belong to you');
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'LEAD_CONTACT_REVEALED',
        entity: 'Lead',
        entityId: leadId,
        metaJson: { lawyerId: lawyer.id, clientId: lead.clientId },
      },
    });

    return {
      leadId,
      mobile: lead.client.mobile,
      email: lead.client.email,
    };
  }

  private async getLawyerByUserId(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    return lawyer;
  }

  /**
   * Resolve the lawyer's monthly lead cap.
   * - TRIAL → unlimited (full access during the trial).
   * - ACTIVE → the cap configured on their plan (`SubscriptionPlanPrice.monthlyLeadCap`).
   * Returns null for "unlimited".
   */
  private async getMonthlyLeadCap(
    lawyerId: string,
    subscriptionStatus: SubscriptionStatus,
  ): Promise<number | null> {
    if (subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return null;
    }
    const activeSub = await this.prisma.subscription.findFirst({
      where: { lawyerId, status: SubscriptionStatus.ACTIVE },
      orderBy: { startDate: 'desc' },
      select: { planName: true },
    });
    if (!activeSub) {
      return null;
    }
    const plan = await this.prisma.subscriptionPlanPrice.findUnique({
      where: { planName: activeSub.planName },
      select: { monthlyLeadCap: true },
    });
    return plan?.monthlyLeadCap ?? null;
  }

  private countLeadsThisMonth(lawyerId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.prisma.lead.count({
      where: { lawyerId, createdAt: { gte: monthStart } },
    });
  }
}
