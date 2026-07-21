import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadStatus,
  Prisma,
  PropertyCaseStatus,
  VerificationStatus,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { NotifyService } from '../../common/notify/notify.service';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChecklistItem {
  key: string;
  label: string;
  why: string;
  required: boolean;
}

const TRANSACTION_TYPES = [
  'FLAT_PURCHASE',
  'SITE_PURCHASE',
  'RESALE_HOUSE',
  'AGRICULTURAL_LAND',
  'OTHER',
];

@Injectable()
export class PropertyService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notify: NotifyService,
    private mail: MailService,
  ) {}

  /** Best checklist for state+type, falling back to state=ANY, then OTHER. */
  async getChecklist(
    state: string,
    transactionType: string,
  ): Promise<ChecklistItem[]> {
    const candidates = await this.prisma.propertyChecklist.findMany({
      where: {
        OR: [
          { state, transactionType },
          { state: 'ANY', transactionType },
          { state: 'ANY', transactionType: 'OTHER' },
        ],
      },
    });
    const exact = candidates.find(
      (c) => c.state === state && c.transactionType === transactionType,
    );
    const anyType = candidates.find(
      (c) => c.state === 'ANY' && c.transactionType === transactionType,
    );
    const fallback = candidates.find(
      (c) => c.state === 'ANY' && c.transactionType === 'OTHER',
    );
    const list = exact ?? anyType ?? fallback;
    return ((list?.items ?? []) as unknown as ChecklistItem[]) || [];
  }

  listTransactionTypes() {
    return TRANSACTION_TYPES.map((t) => ({
      key: t,
      label: t
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  async createCase(
    userId: string,
    dto: { state: string; city: string; transactionType: string },
  ) {
    if (!TRANSACTION_TYPES.includes(dto.transactionType)) {
      throw new BadRequestException('Unknown transaction type');
    }
    return this.prisma.propertyCase.create({
      data: {
        userId,
        state: dto.state.trim(),
        city: dto.city.trim(),
        transactionType: dto.transactionType,
      },
    });
  }

  async myCases(userId: string) {
    return this.prisma.propertyCase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        state: true,
        city: true,
        transactionType: true,
        status: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
    });
  }

  private async getOwnCase(userId: string, id: string) {
    const c = await this.prisma.propertyCase.findFirst({
      where: { id, userId },
      include: { documents: true },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  async myCase(userId: string, id: string) {
    const c = await this.getOwnCase(userId, id);
    const checklist = await this.getChecklist(c.state, c.transactionType);
    return { ...c, checklist };
  }

  /** Tick/untick a checklist item; optional uploaded scan replaces the tick. */
  async setDocument(
    userId: string,
    caseId: string,
    docType: string,
    provided: boolean,
    file?: Express.Multer.File,
  ) {
    const c = await this.getOwnCase(userId, caseId);
    const checklist = await this.getChecklist(c.state, c.transactionType);
    if (!checklist.some((i) => i.key === docType)) {
      throw new BadRequestException('Unknown document type for this checklist');
    }
    let fileUrl: string | undefined;
    if (file) {
      fileUrl = await this.storage.upload(file, 'property');
    }
    if (!provided && !file) {
      await this.prisma.propertyCaseDocument.deleteMany({
        where: { caseId, docType },
      });
      return { docType, provided: false };
    }
    return this.prisma.propertyCaseDocument.upsert({
      where: { caseId_docType: { caseId, docType } },
      update: { provided: true, ...(fileUrl ? { fileUrl } : {}) },
      create: { caseId, docType, provided: true, fileUrl: fileUrl ?? null },
    });
  }

  /** Deterministic analysis: checklist vs provided documents. No AI, no legal opinion. */
  async analyze(userId: string, caseId: string) {
    const c = await this.getOwnCase(userId, caseId);
    const checklist = await this.getChecklist(c.state, c.transactionType);
    const have = new Set(
      c.documents.filter((d) => d.provided).map((d) => d.docType),
    );

    const items = checklist.map((i) => ({
      ...i,
      status: have.has(i.key) ? ('PROVIDED' as const) : ('MISSING' as const),
    }));
    const requiredItems = items.filter((i) => i.required);
    const missingRequired = requiredItems.filter((i) => i.status === 'MISSING');
    const report = {
      generatedAt: new Date().toISOString(),
      state: c.state,
      city: c.city,
      transactionType: c.transactionType,
      items,
      summary: {
        total: items.length,
        provided: items.filter((i) => i.status === 'PROVIDED').length,
        missingRequired: missingRequired.length,
        completeness: requiredItems.length
          ? Math.round(
              (requiredItems.filter((i) => i.status === 'PROVIDED').length /
                requiredItems.length) *
                100,
            )
          : 100,
      },
      disclaimer:
        'Preliminary informational document check — not legal advice and not a title opinion. A verified property lawyer should review the documents before you transact.',
    };

    await this.prisma.propertyCase.update({
      where: { id: c.id },
      data: {
        reportJson: report,
        status:
          c.status === PropertyCaseStatus.OPEN
            ? PropertyCaseStatus.ANALYZED
            : c.status,
      },
    });
    return report;
  }

  /** Suggest verified property lawyers in the case city for the opinion handoff. */
  async suggestLawyers(userId: string, caseId: string) {
    const c = await this.getOwnCase(userId, caseId);
    return this.prisma.lawyer.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        practiceAreas: {
          some: {
            practiceArea: {
              name: { contains: 'propert', mode: 'insensitive' },
            },
          },
        },
        serviceAreas: {
          some: {
            active: true,
            city: { name: { equals: c.city, mode: 'insensitive' } },
          },
        },
      },
      take: 6,
      orderBy: [{ ratingAvg: 'desc' }, { experienceYears: 'desc' }],
      select: {
        id: true,
        fullName: true,
        slug: true,
        experienceYears: true,
        ratingAvg: true,
        ratingCount: true,
        profileImageUrl: true,
        city: { select: { name: true } },
      },
    });
  }

  /** Hand off to a lawyer: creates a normal lead with the case summary embedded. */
  async requestOpinion(userId: string, caseId: string, lawyerId: string) {
    const c = await this.getOwnCase(userId, caseId);
    if (c.leadId)
      throw new BadRequestException(
        'An opinion request was already sent for this case',
      );
    const report = c.reportJson as {
      items?: { label: string; status: string; required: boolean }[];
    } | null;
    if (!report?.items) {
      throw new BadRequestException(
        'Run the analysis first, then request an opinion',
      );
    }
    const lawyer = await this.prisma.lawyer.findFirst({
      where: { id: lawyerId, verificationStatus: VerificationStatus.APPROVED },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!lawyer) throw new NotFoundException('Lawyer not found');

    const haveList = report.items
      .filter((i) => i.status === 'PROVIDED')
      .map((i) => i.label);
    const missingList = report.items
      .filter((i) => i.status === 'MISSING')
      .map((i) => i.label);
    const description =
      `Property Document Check — request for a professional legal opinion.\n` +
      `Transaction: ${c.transactionType.replace(/_/g, ' ').toLowerCase()} in ${c.city}, ${c.state}.\n` +
      `Documents available: ${haveList.join(', ') || 'none listed'}.\n` +
      `Documents missing: ${missingList.join(', ') || 'none'}.\n` +
      `(Generated by the LawMitran preliminary document check — the client will share the files directly.)`;

    const lead = await this.prisma.lead.create({
      data: {
        clientId: userId,
        lawyerId: lawyer.id,
        practiceArea: 'Property',
        description,
        status: LeadStatus.NEW,
      },
    });
    await this.prisma.propertyCase.update({
      where: { id: c.id },
      data: { leadId: lead.id, status: PropertyCaseStatus.LAWYER_REVIEW },
    });

    await this.mail.sendNewLeadNotification(lawyer.user.email, 'Property');
    await this.notify.notifyUser(lawyer.user.id, 'LEAD_NEW', {
      title: 'New property-opinion lead',
      body: `A client in ${c.city} wants a legal opinion on their property documents.`,
    });
    return { leadId: lead.id, status: PropertyCaseStatus.LAWYER_REVIEW };
  }
}
