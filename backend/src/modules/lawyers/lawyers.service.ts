import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, Prisma, Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateLawyerProfileDto } from './dto/create-lawyer-profile.dto';
import { ReviewLawyerDto } from './dto/review-lawyer.dto';
import { SearchLawyersDto } from './dto/search-lawyers.dto';
import { UpdateLawyerProfileDto } from './dto/update-lawyer-profile.dto';

// Free-trial length in days — configurable (e.g. set TRIAL_DAYS=15 to shorten the trial).
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 30);

export interface LawyerProfileFiles {
  certificate?: Express.Multer.File[];
}

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  fullName: true,
  barCouncilState: true,
  experienceYears: true,
  gender: true,
  bio: true,
  profileImageUrl: true,
  latitude: true,
  longitude: true,
  ratingAvg: true,
  ratingCount: true,
  verificationStatus: true,
  createdAt: true,
  city: { select: { id: true, name: true, district: { select: { name: true, state: { select: { name: true } } } } } },
  practiceAreas: { select: { practiceArea: { select: { id: true, name: true, slug: true } }, proficiency: true } },
  languages: { select: { language: { select: { id: true, name: true, code: true } } } },
  courts: { select: { court: { select: { id: true, name: true, type: true } } } },
} satisfies Prisma.LawyerSelect;

const MARKER_SELECT = {
  id: true,
  fullName: true,
  latitude: true,
  longitude: true,
  ratingAvg: true,
  ratingCount: true,
  city: { select: { name: true } },
  practiceAreas: { take: 2, select: { practiceArea: { select: { name: true } } } },
} satisfies Prisma.LawyerSelect;

@Injectable()
export class LawyersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
  ) {}

  async createProfile(
    userId: string,
    dto: CreateLawyerProfileDto,
    files: LawyerProfileFiles,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.LAWYER) {
      throw new ForbiddenException(
        'Only users registered with the lawyer role can create a profile',
      );
    }

    const existing = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        'Lawyer profile already exists for this user',
      );
    }

    const certificateFile = files.certificate?.[0];
    if (!certificateFile) {
      throw new BadRequestException('Bar council certificate is required');
    }

    const certificateImageUrl = await this.storage.upload(
      certificateFile,
      'certificates',
    );

    // trialEndDate is non-nullable but the trial only actually starts once an
    // admin approves the profile (see review()) — this is just a placeholder.
    const placeholderTrialEnd = new Date();
    placeholderTrialEnd.setDate(placeholderTrialEnd.getDate() + TRIAL_DAYS);

    // city and practiceAreas are relational; connect them via dedicated endpoints
    const lawyer = await this.prisma.lawyer.create({
      data: {
        userId,
        fullName: dto.fullName,
        barCouncilNumber: dto.barCouncilNumber,
        barCouncilState: dto.barCouncilState,
        experienceYears: dto.experienceYears,
        certificateImageUrl,
        trialEndDate: placeholderTrialEnd,
      },
    });

    await this.prisma.verification.create({
      data: {
        lawyerId: lawyer.id,
        documentType: 'BAR_COUNCIL_CERTIFICATE',
        documentUrl: certificateImageUrl,
      },
    });

    return lawyer;
  }

  async getOwnProfile(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    return lawyer;
  }

  async updateOwnProfile(userId: string, dto: UpdateLawyerProfileDto) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    // Only update scalar fields; city/practiceAreas are managed via dedicated endpoints
    const { city: _city, practiceAreas: _pa, ...scalarFields } = dto;
    void _city; void _pa;
    return this.prisma.lawyer.update({ where: { userId }, data: scalarFields });
  }

  async search(query: SearchLawyersDto) {
    const {
      city, practiceArea, courtId,
      experienceMin, experienceMax,
      language, gender, ratingMin, sort,
      swLat, swLng, neLat, neLng,
      page, limit,
    } = query;

    const where = this.buildWhere({
      city, practiceArea, courtId,
      experienceMin, experienceMax,
      language, gender, ratingMin,
      swLat, swLng, neLat, neLng,
    });

    const orderBy: Prisma.LawyerOrderByWithRelationInput =
      sort === 'rating' ? { ratingAvg: 'desc' }
      : sort === 'experience' ? { experienceYears: 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.lawyer.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lawyer.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMarkers(query: SearchLawyersDto) {
    const {
      city, practiceArea, courtId,
      experienceMin, experienceMax,
      language, gender, ratingMin,
      swLat, swLng, neLat, neLng,
    } = query;

    const where = this.buildWhere({
      city, practiceArea, courtId,
      experienceMin, experienceMax,
      language, gender, ratingMin,
      swLat, swLng, neLat, neLng,
    });

    return this.prisma.lawyer.findMany({
      where,
      select: MARKER_SELECT,
      take: 200,
    });
  }

  private buildWhere(params: {
    city?: string;
    practiceArea?: string;
    courtId?: string;
    experienceMin?: number;
    experienceMax?: number;
    language?: string;
    gender?: Gender;
    ratingMin?: number;
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
  }): Prisma.LawyerWhereInput {
    const {
      city, practiceArea, courtId,
      experienceMin, experienceMax,
      language, gender, ratingMin,
      swLat, swLng, neLat, neLng,
    } = params;

    return {
      verificationStatus: VerificationStatus.APPROVED,
      ...(city ? { city: { is: { name: { equals: city, mode: 'insensitive' } } } } : {}),
      ...(practiceArea ? { practiceAreas: { some: { practiceArea: { name: { equals: practiceArea, mode: 'insensitive' } } } } } : {}),
      ...(courtId ? { courts: { some: { courtId } } } : {}),
      ...(experienceMin !== undefined ? { experienceYears: { gte: experienceMin } } : {}),
      ...(experienceMax !== undefined ? { experienceYears: { lte: experienceMax } } : {}),
      ...(language ? { languages: { some: { language: { name: { equals: language, mode: 'insensitive' } } } } } : {}),
      ...(gender ? { gender } : {}),
      ...(ratingMin !== undefined ? { ratingAvg: { gte: ratingMin } } : {}),
      ...(swLat !== undefined && neLat !== undefined ? { latitude: { gte: swLat, lte: neLat } } : {}),
      ...(swLng !== undefined && neLng !== undefined ? { longitude: { gte: swLng, lte: neLng } } : {}),
    };
  }

  async getPublicProfile(id: string) {
    const lawyer = await this.prisma.lawyer.findFirst({
      where: { id, verificationStatus: VerificationStatus.APPROVED },
      select: PUBLIC_SELECT,
    });
    if (!lawyer) {
      throw new NotFoundException('Lawyer not found');
    }
    return lawyer;
  }

  /** SEO-friendly lookup: /lawyer/:slug → profile (only APPROVED lawyers). */
  async getPublicProfileBySlug(slug: string) {
    const lawyer = await this.prisma.lawyer.findFirst({
      where: { slug, verificationStatus: VerificationStatus.APPROVED },
      select: PUBLIC_SELECT,
    });
    if (!lawyer) {
      throw new NotFoundException('Lawyer not found');
    }
    return lawyer;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  listPending() {
    return this.prisma.lawyer.findMany({
      where: {
        verificationStatus: {
          in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async review(adminUserId: string, lawyerId: string, dto: ReviewLawyerDto) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { id: lawyerId },
      include: { user: true },
    });
    if (!lawyer) {
      throw new NotFoundException('Lawyer not found');
    }

    const now = new Date();
    const data: Prisma.LawyerUpdateInput = {
      verificationStatus: dto.status,
      approvedBy: adminUserId,
      approvedAt: now,
    };

    if (dto.status === VerificationStatus.APPROVED) {
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
      data.trialStartDate = now;
      data.trialEndDate = trialEndDate;
      // Generate an SEO slug once (kept stable across re-approvals).
      if (!lawyer.slug) {
        data.slug = `${this.slugify(lawyer.fullName)}-${lawyerId.slice(0, 6)}`;
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.lawyer.update({ where: { id: lawyerId }, data }),
      this.prisma.verification.updateMany({
        where: {
          lawyerId,
          status: {
            in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
          },
        },
        data: {
          status: dto.status,
          reviewedBy: adminUserId,
          reviewedAt: now,
          comments: dto.comments,
        },
      }),
    ]);

    if (dto.status === VerificationStatus.APPROVED) {
      await this.mail.sendLawyerApproved(lawyer.user.email);
    }

    return updated;
  }
}
