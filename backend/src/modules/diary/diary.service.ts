import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiaryCaseStatus,
  DiaryPriority,
  DiaryReminderType,
  LeadStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DiaryCaseCreateDto,
  DiaryCaseQueryDto,
  DiaryCaseUpdateDto,
  DiaryClientDto,
  DiaryClientUpdateDto,
  DiaryHearingDto,
  DiaryReminderDto,
} from './dto/diary.dto';

/**
 * Lawyer Case Diary — premium practice management.
 * Every read/write is scoped to the requesting lawyer (ownership enforced at
 * the query level, never by trusting ids from the client). Soft deletes only.
 */
@Injectable()
export class DiaryService {
  constructor(private prisma: PrismaService) {}

  /** Resolve the lawyer AND enforce the premium gate (ACTIVE or TRIAL). */
  private async lawyerOf(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { userId },
      select: { id: true, subscriptionStatus: true },
    });
    if (!lawyer) throw new NotFoundException('Lawyer profile not found');
    if (
      lawyer.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      lawyer.subscriptionStatus !== SubscriptionStatus.TRIAL
    ) {
      throw new ForbiddenException(
        'Case Diary is part of your LawMitran subscription — renew your plan to continue',
      );
    }
    return lawyer;
  }

  private async log(lawyerId: string, action: string, summary: string, caseId?: string) {
    await this.prisma.diaryActivity.create({
      data: { lawyerId, caseId: caseId ?? null, action, summary },
    });
  }

  // ================= dashboard =================

  async dashboard(userId: string) {
    const lawyer = await this.lawyerOf(userId);
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const live = { lawyerId: lawyer.id, deletedAt: null };
    const openStatuses: DiaryCaseStatus[] = [
      DiaryCaseStatus.NEW, DiaryCaseStatus.CONSULTATION, DiaryCaseStatus.NOTICE_SENT,
      DiaryCaseStatus.CASE_FILED, DiaryCaseStatus.EVIDENCE, DiaryCaseStatus.ARGUMENTS,
      DiaryCaseStatus.JUDGMENT_RESERVED,
    ];

    const [openCases, closedCases, todayHearings, upcomingHearings, dueReminders, recentActivity, recentCases] =
      await this.prisma.$transaction([
        this.prisma.diaryCase.count({ where: { ...live, status: { in: openStatuses } } }),
        this.prisma.diaryCase.count({
          where: { ...live, status: { in: [DiaryCaseStatus.DISPOSED, DiaryCaseStatus.CLOSED] } },
        }),
        this.prisma.diaryCase.findMany({
          where: { ...live, nextHearingAt: { gte: dayStart, lte: dayEnd } },
          select: { id: true, title: true, caseNumber: true, courtName: true, nextHearingAt: true },
          orderBy: { nextHearingAt: 'asc' },
        }),
        this.prisma.diaryCase.findMany({
          where: { ...live, nextHearingAt: { gt: dayEnd, lte: in7 } },
          select: { id: true, title: true, caseNumber: true, courtName: true, nextHearingAt: true },
          orderBy: { nextHearingAt: 'asc' },
          take: 8,
        }),
        this.prisma.diaryReminder.findMany({
          where: { lawyerId: lawyer.id, deletedAt: null, done: false, dueAt: { lte: in7 } },
          orderBy: { dueAt: 'asc' },
          take: 8,
          include: { case: { select: { id: true, title: true } } },
        }),
        this.prisma.diaryActivity.findMany({
          where: { lawyerId: lawyer.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.diaryCase.findMany({
          where: live,
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, title: true, status: true, updatedAt: true },
        }),
      ]);

    return { openCases, closedCases, todayHearings, upcomingHearings, dueReminders, recentActivity, recentCases };
  }

  // ================= clients =================

  async listClients(userId: string, q?: string) {
    const lawyer = await this.lawyerOf(userId);
    return this.prisma.diaryClient.findMany({
      where: {
        lawyerId: lawyer.id,
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { cases: { where: { deletedAt: null } } } } },
    });
  }

  async createClient(userId: string, dto: DiaryClientDto) {
    const lawyer = await this.lawyerOf(userId);
    const client = await this.prisma.diaryClient.create({
      data: { lawyerId: lawyer.id, ...dto },
    });
    await this.log(lawyer.id, 'CLIENT_CREATED', `Added client "${client.name}"`);
    return client;
  }

  async updateClient(userId: string, id: string, dto: DiaryClientUpdateDto) {
    const lawyer = await this.lawyerOf(userId);
    const existing = await this.prisma.diaryClient.findFirst({
      where: { id, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Client not found');
    return this.prisma.diaryClient.update({ where: { id }, data: { ...dto } });
  }

  // ================= cases =================

  async listCases(userId: string, q: DiaryCaseQueryDto) {
    const lawyer = await this.lawyerOf(userId);
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 20, 100);
    const where: Prisma.DiaryCaseWhereInput = {
      lawyerId: lawyer.id,
      deletedAt: null,
      ...(q.status ? { status: q.status as DiaryCaseStatus } : {}),
      ...(q.priority ? { priority: q.priority as DiaryPriority } : {}),
      ...(q.practiceArea ? { practiceAreaSlug: q.practiceArea } : {}),
      ...(q.q
        ? {
            OR: [
              { title: { contains: q.q, mode: 'insensitive' } },
              { caseNumber: { contains: q.q, mode: 'insensitive' } },
              { courtName: { contains: q.q, mode: 'insensitive' } },
              { judgeName: { contains: q.q, mode: 'insensitive' } },
              { oppositeParty: { contains: q.q, mode: 'insensitive' } },
              { client: { name: { contains: q.q, mode: 'insensitive' } } },
              { client: { mobile: { contains: q.q } } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.diaryCase.count({ where }),
      this.prisma.diaryCase.findMany({
        where,
        orderBy: [{ nextHearingAt: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: { select: { id: true, name: true, mobile: true } } },
      }),
    ]);
    return { total, page, pageSize, pages: Math.ceil(total / pageSize), items };
  }

  async getCase(userId: string, id: string) {
    const lawyer = await this.lawyerOf(userId);
    const c = await this.prisma.diaryCase.findFirst({
      where: { id, lawyerId: lawyer.id, deletedAt: null },
      include: {
        client: true,
        hearings: { orderBy: { date: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 15 },
      },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  private caseData(dto: DiaryCaseCreateDto | DiaryCaseUpdateDto) {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      caseNumber: dto.caseNumber,
      courtName: dto.courtName,
      courtHall: dto.courtHall,
      judgeName: dto.judgeName,
      practiceAreaSlug: dto.practiceAreaSlug,
      caseType: dto.caseType,
      oppositeParty: dto.oppositeParty,
      ...(dto.status ? { status: dto.status as DiaryCaseStatus } : {}),
      stage: dto.stage,
      ...(dto.priority ? { priority: dto.priority as DiaryPriority } : {}),
      description: dto.description,
      ...(dto.dateFiled !== undefined
        ? { dateFiled: dto.dateFiled ? new Date(dto.dateFiled) : null }
        : {}),
      ...(dto.nextHearingAt !== undefined
        ? { nextHearingAt: dto.nextHearingAt ? new Date(dto.nextHearingAt) : null }
        : {}),
      remarks: dto.remarks,
      lawyerNotes: dto.lawyerNotes,
    };
  }

  async createCase(userId: string, dto: DiaryCaseCreateDto) {
    const lawyer = await this.lawyerOf(userId);
    const client = await this.prisma.diaryClient.findFirst({
      where: { id: dto.clientId, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!client) throw new BadRequestException('Pick a valid client');
    const c = await this.prisma.diaryCase.create({
      data: { lawyerId: lawyer.id, clientId: client.id, ...this.caseData(dto), title: dto.title },
    });
    await this.log(lawyer.id, 'CASE_CREATED', `Created case "${c.title}"`, c.id);
    return c;
  }

  async updateCase(userId: string, id: string, dto: DiaryCaseUpdateDto) {
    const lawyer = await this.lawyerOf(userId);
    const existing = await this.prisma.diaryCase.findFirst({
      where: { id, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Case not found');
    if (dto.clientId) {
      const client = await this.prisma.diaryClient.findFirst({
        where: { id: dto.clientId, lawyerId: lawyer.id, deletedAt: null },
      });
      if (!client) throw new BadRequestException('Pick a valid client');
    }
    const updated = await this.prisma.diaryCase.update({
      where: { id },
      data: { ...(dto.clientId ? { clientId: dto.clientId } : {}), ...this.caseData(dto) },
    });
    if (dto.status && dto.status !== existing.status) {
      await this.log(lawyer.id, 'STATUS_CHANGED', `Status → ${dto.status}`, id);
    } else {
      await this.log(lawyer.id, 'CASE_UPDATED', `Updated "${updated.title}"`, id);
    }
    return updated;
  }

  async deleteCase(userId: string, id: string) {
    const lawyer = await this.lawyerOf(userId);
    const existing = await this.prisma.diaryCase.findFirst({
      where: { id, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Case not found');
    await this.prisma.diaryCase.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.log(lawyer.id, 'CASE_DELETED', `Deleted "${existing.title}"`, id);
    return { success: true };
  }

  // ================= hearings (append-only) =================

  async addHearing(userId: string, caseId: string, dto: DiaryHearingDto) {
    const lawyer = await this.lawyerOf(userId);
    const c = await this.prisma.diaryCase.findFirst({
      where: { id: caseId, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!c) throw new NotFoundException('Case not found');
    const hearing = await this.prisma.diaryHearing.create({
      data: {
        caseId,
        date: new Date(dto.date),
        courtNumber: dto.courtNumber,
        judgeName: dto.judgeName,
        purpose: dto.purpose,
        outcome: dto.outcome,
        nextHearingAt: dto.nextHearingAt ? new Date(dto.nextHearingAt) : null,
        notes: dto.notes,
      },
    });
    // Keep the case's next hearing in sync with the latest entry.
    if (dto.nextHearingAt) {
      await this.prisma.diaryCase.update({
        where: { id: caseId },
        data: { nextHearingAt: new Date(dto.nextHearingAt) },
      });
    }
    await this.log(
      lawyer.id,
      'HEARING_ADDED',
      `Hearing on ${new Date(dto.date).toLocaleDateString('en-IN')}${dto.purpose ? ` — ${dto.purpose}` : ''}`,
      caseId,
    );
    return hearing;
  }

  // ================= reminders =================

  async listReminders(userId: string, includeDone = false) {
    const lawyer = await this.lawyerOf(userId);
    return this.prisma.diaryReminder.findMany({
      where: { lawyerId: lawyer.id, deletedAt: null, ...(includeDone ? {} : { done: false }) },
      orderBy: { dueAt: 'asc' },
      include: { case: { select: { id: true, title: true } } },
      take: 100,
    });
  }

  async createReminder(userId: string, dto: DiaryReminderDto) {
    const lawyer = await this.lawyerOf(userId);
    if (dto.caseId) {
      const c = await this.prisma.diaryCase.findFirst({
        where: { id: dto.caseId, lawyerId: lawyer.id, deletedAt: null },
      });
      if (!c) throw new BadRequestException('Case not found');
    }
    return this.prisma.diaryReminder.create({
      data: {
        lawyerId: lawyer.id,
        caseId: dto.caseId ?? null,
        type: (dto.type as DiaryReminderType) ?? DiaryReminderType.CUSTOM,
        dueAt: new Date(dto.dueAt),
        notes: dto.notes,
      },
    });
  }

  async setReminderDone(userId: string, id: string, done: boolean) {
    const lawyer = await this.lawyerOf(userId);
    const r = await this.prisma.diaryReminder.findFirst({
      where: { id, lawyerId: lawyer.id, deletedAt: null },
    });
    if (!r) throw new NotFoundException('Reminder not found');
    return this.prisma.diaryReminder.update({ where: { id }, data: { done } });
  }

  // ================= calendar =================

  /** Month feed: past hearings, upcoming next-hearing dates, and reminders. */
  async calendar(userId: string, month: string) {
    const lawyer = await this.lawyerOf(userId);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be YYYY-MM');
    }
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999); // last day of month

    const [hearings, nextHearings, reminders] = await this.prisma.$transaction([
      this.prisma.diaryHearing.findMany({
        where: {
          date: { gte: start, lte: end },
          case: { lawyerId: lawyer.id, deletedAt: null },
        },
        select: {
          id: true,
          date: true,
          purpose: true,
          case: { select: { id: true, title: true } },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.diaryCase.findMany({
        where: {
          lawyerId: lawyer.id,
          deletedAt: null,
          nextHearingAt: { gte: start, lte: end },
        },
        select: { id: true, title: true, nextHearingAt: true, courtName: true },
        orderBy: { nextHearingAt: 'asc' },
      }),
      this.prisma.diaryReminder.findMany({
        where: {
          lawyerId: lawyer.id,
          deletedAt: null,
          dueAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          dueAt: true,
          type: true,
          notes: true,
          done: true,
          case: { select: { id: true, title: true } },
        },
        orderBy: { dueAt: 'asc' },
      }),
    ]);
    return { month, hearings, nextHearings, reminders };
  }

  // ================= lead → case (the marketplace bridge) =================

  async createCaseFromLead(userId: string, leadId: string) {
    const lawyer = await this.lawyerOf(userId);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, lawyerId: lawyer.id },
      include: { client: { select: { fullName: true, email: true, mobile: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === LeadStatus.NEW) {
      throw new BadRequestException('Contact the client first — then convert the lead to a case');
    }

    // Reuse the diary client if this lead was converted before.
    let client = await this.prisma.diaryClient.findFirst({
      where: { lawyerId: lawyer.id, leadId: lead.id, deletedAt: null },
    });
    if (!client) {
      client = await this.prisma.diaryClient.create({
        data: {
          lawyerId: lawyer.id,
          name: lead.client.fullName ?? lead.client.email,
          mobile: lead.client.mobile,
          email: lead.client.email,
          leadId: lead.id,
        },
      });
    }

    const existingCase = await this.prisma.diaryCase.findFirst({
      where: { lawyerId: lawyer.id, leadId: lead.id, deletedAt: null },
    });
    if (existingCase) return existingCase;

    const c = await this.prisma.diaryCase.create({
      data: {
        lawyerId: lawyer.id,
        clientId: client.id,
        title: `${lead.practiceArea} — ${client.name}`,
        practiceAreaSlug: lead.practiceArea,
        description: lead.description,
        status: DiaryCaseStatus.CONSULTATION,
        leadId: lead.id,
      },
    });
    await this.log(lawyer.id, 'CASE_FROM_LEAD', `Converted lead into case "${c.title}"`, c.id);
    return c;
  }
}
