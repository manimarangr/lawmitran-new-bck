import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Gender,
  Prisma,
  Role,
  VerificationStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { paginate, resolvePagination } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { NotifyService } from '../../common/notify/notify.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../../common/audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateLawyerProfileDto } from './dto/create-lawyer-profile.dto';
import { ReviewLawyerDto } from './dto/review-lawyer.dto';
import { SearchLawyersDto } from './dto/search-lawyers.dto';
import { UpdateLawyerProfileDto } from './dto/update-lawyer-profile.dto';

// Free-trial length in days — configurable (e.g. set TRIAL_DAYS=15 to shorten the trial).
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 30);

export interface LawyerProfileFiles {
  certificate?: Express.Multer.File[];
  photo?: Express.Multer.File[];
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
  city: {
    select: {
      id: true,
      name: true,
      district: { select: { name: true, state: { select: { name: true } } } },
    },
  },
  practiceAreas: {
    select: {
      practiceArea: { select: { id: true, name: true, slug: true } },
      proficiency: true,
    },
  },
  languages: {
    select: { language: { select: { id: true, name: true, code: true } } },
  },
  courts: {
    select: { court: { select: { id: true, name: true, type: true } } },
  },
  awards: {
    select: { id: true, type: true, year: true, title: true },
    orderBy: { year: 'desc' as const },
  },
  offices: {
    select: {
      id: true,
      label: true,
      addressLine: true,
      isPrimary: true,
      city: { select: { id: true, name: true } },
      locality: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { isPrimary: 'desc' as const },
  },
  serviceAreas: {
    where: { active: true },
    select: { city: { select: { id: true, name: true } } },
  },
} satisfies Prisma.LawyerSelect;

const MARKER_SELECT = {
  id: true,
  fullName: true,
  latitude: true,
  longitude: true,
  ratingAvg: true,
  ratingCount: true,
  city: { select: { name: true } },
  practiceAreas: {
    take: 2,
    select: { practiceArea: { select: { name: true } } },
  },
} satisfies Prisma.LawyerSelect;

@Injectable()
export class LawyersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
    private notify: NotifyService,
    private settings: SettingsService,
    private audit: AuditService,
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

    const photoFile = files.photo?.[0];
    if (!photoFile) {
      throw new BadRequestException('Profile photo is required');
    }
    if (!photoFile.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Profile photo must be an image (JPG/PNG/WebP)',
      );
    }
    if (photoFile.size > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'Profile photo is too large — maximum size is 2 MB',
      );
    }
    const profileImageUrl = await this.storage.upload(photoFile, 'profiles');

    // trialEndDate is non-nullable but the trial only actually starts once an
    // admin approves the profile (see review()) — this is just a placeholder.
    const trialDays = await this.settings.getNumber('TRIAL_DAYS', TRIAL_DAYS);
    const placeholderTrialEnd = new Date();
    placeholderTrialEnd.setDate(placeholderTrialEnd.getDate() + trialDays);

    // docs/28: the profile is never geo-empty — the city must resolve.
    const city = await this.findCityByName(dto.city);

    this.assertBioClean(dto.bio);
    const lawyer = await this.prisma.lawyer.create({
      data: {
        userId,
        fullName: dto.fullName,
        barCouncilNumber: dto.barCouncilNumber,
        barCouncilState: dto.barCouncilState,
        experienceYears: dto.experienceYears,
        bio: dto.bio,
        profileImageUrl,
        certificateImageUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        trialEndDate: placeholderTrialEnd,
        cityId: city.id,
      },
    });

    // Practice areas from the onboarding form (comma-separated names → reference rows).
    const areaNames = (dto.practiceAreas ?? [])
      .map((a) => a.trim())
      .filter(Boolean);
    for (const name of areaNames) {
      const area = await this.prisma.practiceArea.findFirst({
        where: { name: { contains: name, mode: 'insensitive' } },
      });
      if (area) {
        await this.prisma.lawyerPracticeArea.upsert({
          where: {
            lawyerId_practiceAreaId: {
              lawyerId: lawyer.id,
              practiceAreaId: area.id,
            },
          },
          create: { lawyerId: lawyer.id, practiceAreaId: area.id },
          update: {},
        });
      }
    }

    // Languages + courts from the onboarding form (reference rows; unknown names ignored).
    for (const name of (dto.languages ?? [])
      .map((l) => l.trim())
      .filter(Boolean)) {
      const lang = await this.prisma.language.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { code: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
      if (lang) {
        await this.prisma.lawyerLanguage.upsert({
          where: {
            lawyerId_languageId: { lawyerId: lawyer.id, languageId: lang.id },
          },
          create: { lawyerId: lawyer.id, languageId: lang.id },
          update: {},
        });
      }
    }
    for (const name of (dto.courts ?? [])
      .map((c) => c.trim())
      .filter(Boolean)) {
      const court = await this.prisma.court.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { code: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
      if (court) {
        await this.prisma.lawyerCourt.upsert({
          where: {
            lawyerId_courtId: { lawyerId: lawyer.id, courtId: court.id },
          },
          create: { lawyerId: lawyer.id, courtId: court.id },
          update: {},
        });
      }
    }

    // docs/28 rule 4: never geo-empty — primary office + one service area from the chosen city.
    const officeLocalityId = await this.validLocalityId(
      dto.localityId,
      city.id,
    );
    await this.prisma.$transaction([
      this.prisma.lawyerOffice.create({
        data: {
          lawyerId: lawyer.id,
          cityId: city.id,
          label: dto.officeLabel?.trim() || 'Main office',
          addressLine: dto.addressLine,
          pincode: dto.pincode,
          landmark: dto.landmark ?? null,
          localityId: officeLocalityId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          isPrimary: true,
        },
      }),
      this.prisma.lawyerServiceArea.create({
        data: { lawyerId: lawyer.id, cityId: city.id, active: true },
      }),
    ]);

    await this.prisma.verification.create({
      data: {
        lawyerId: lawyer.id,
        documentType: 'BAR_COUNCIL_CERTIFICATE',
        documentUrl: certificateImageUrl,
      },
    });

    await this.notify.notifyAdmins('LAWYER_SUBMITTED', {
      title: `New lawyer awaiting review: ${lawyer.fullName}`,
      body: `${lawyer.barCouncilNumber} · ${lawyer.barCouncilState} — ID card and details submitted.`,
      link: `/admin/approvals/${lawyer.id}`,
    });

    return lawyer;
  }

  async getOwnProfile(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { userId },
      include: {
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, comments: true, reviewedAt: true },
        },
        city: { select: { id: true, name: true } },
        practiceAreas: {
          select: {
            practiceArea: { select: { id: true, name: true, slug: true } },
            proficiency: true,
          },
        },
        languages: {
          select: {
            language: { select: { id: true, name: true, code: true } },
          },
        },
        courts: {
          select: { court: { select: { id: true, name: true, type: true } } },
        },
        offices: {
          select: {
            id: true,
            label: true,
            addressLine: true,
            pincode: true,
            landmark: true,
            latitude: true,
            longitude: true,
            isPrimary: true,
            city: { select: { id: true, name: true } },
          },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    return lawyer;
  }

  async updateOwnProfile(userId: string, dto: UpdateLawyerProfileDto) {
    this.assertBioClean(dto.bio);
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException('Lawyer profile not found');
    }
    // Only update scalar fields; city/practiceAreas/offices have dedicated endpoints,
    // languages/courts are relations handled below, coords come from the primary office.
    const {
      city: _city,
      practiceAreas,
      addressLine: _al,
      pincode: _pc,
      landmark: _lm,
      officeLabel: _ol,
      latitude: _lat,
      longitude: _lng,
      languages,
      courts,
      ...scalarFields
    } = dto;
    void _city;
    void _al;
    void _pc;
    void _lm;
    void _ol;
    void _lat;
    void _lng;

    if (practiceAreas?.length)
      await this.replacePracticeAreas(lawyer.id, practiceAreas);
    if (languages?.length) await this.replaceLanguages(lawyer.id, languages);
    if (courts?.length) await this.replaceCourts(lawyer.id, courts);

    return this.prisma.lawyer.update({ where: { userId }, data: scalarFields });
  }

  /** Replace the practice-area links (names; unknown values ignored, keeps >=1). */
  private async replacePracticeAreas(lawyerId: string, names: string[]) {
    const areaIds: string[] = [];
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const area = await this.prisma.practiceArea.findFirst({
        where: { name: { contains: name, mode: 'insensitive' } },
      });
      if (area) areaIds.push(area.id);
    }
    if (areaIds.length === 0) return; // never wipe the last areas with unknown names
    await this.prisma.lawyerPracticeArea.deleteMany({ where: { lawyerId } });
    for (const practiceAreaId of areaIds) {
      await this.prisma.lawyerPracticeArea.upsert({
        where: { lawyerId_practiceAreaId: { lawyerId, practiceAreaId } },
        create: { lawyerId, practiceAreaId },
        update: {},
      });
    }
  }

  /** Replace the language links (names or codes; unknown values ignored). */
  private async replaceLanguages(lawyerId: string, names: string[]) {
    await this.prisma.lawyerLanguage.deleteMany({ where: { lawyerId } });
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const lang = await this.prisma.language.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { code: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
      if (lang) {
        await this.prisma.lawyerLanguage.create({
          data: { lawyerId, languageId: lang.id },
        });
      }
    }
  }

  /** Replace the court links (names or codes; unknown values ignored). */
  private async replaceCourts(lawyerId: string, names: string[]) {
    await this.prisma.lawyerCourt.deleteMany({ where: { lawyerId } });
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const court = await this.prisma.court.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { code: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
      if (court) {
        await this.prisma.lawyerCourt.create({
          data: { lawyerId, courtId: court.id },
        });
      }
    }
  }

  /** Great-circle distance in km between two lat/lng points. */
  private haversineKm(
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number,
  ): number {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((aLat * Math.PI) / 180) *
        Math.cos((bLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async search(query: SearchLawyersDto) {
    const {
      city,
      practiceArea,
      courtId,
      locality,
      subscribed,
      experienceMin,
      experienceMax,
      language,
      gender,
      ratingMin,
      sort,
      swLat,
      swLng,
      neLat,
      neLng,
      lat,
      lng,
      radiusKm,
      page,
      limit,
    } = query;

    const where = this.buildWhere({
      city,
      practiceArea,
      courtId,
      experienceMin,
      experienceMax,
      language,
      gender,
      ratingMin,
      swLat,
      swLng,
      neLat,
      neLng,
      subscribed: subscribed === '1' || subscribed === 'true',
    });

    const orderBy: Prisma.LawyerOrderByWithRelationInput =
      sort === 'rating'
        ? { ratingAvg: 'desc' }
        : sort === 'experience'
          ? { experienceYears: 'desc' }
          : { createdAt: 'desc' };

    // Point-radius "near me" search — in-memory distance over a capped candidate
    // set, same approach as the locality-ranking boost below (fine at current scale).
    if (lat !== undefined && lng !== undefined) {
      const all = await this.prisma.lawyer.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy,
        take: 200,
      });
      const scored = all
        .map((l) => ({
          l,
          km:
            l.latitude == null || l.longitude == null
              ? null
              : this.haversineKm(lat, lng, l.latitude, l.longitude),
        }))
        .filter(
          (x) => radiusKm === undefined || (x.km !== null && x.km <= radiusKm),
        );
      if (sort === 'distance' || sort === undefined) {
        scored.sort(
          (a, b) =>
            (a.km ?? Number.MAX_SAFE_INTEGER) -
            (b.km ?? Number.MAX_SAFE_INTEGER),
        );
      }
      const total = scored.length;
      const items = scored.slice((page - 1) * limit, page * limit).map((x) => ({
        ...x.l,
        distanceKm: x.km === null ? null : Math.round(x.km * 10) / 10,
      }));
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Locality = ranking boost, never a hard filter (a thin marketplace would
    // return zero results). Lawyers whose office is tagged with the locality
    // or whose pin is nearest its centroid sort first; the rest of the city
    // follows. In-memory sort over a capped set — fine at current scale.
    if (locality && city) {
      const loc = await this.prisma.locality.findFirst({
        where: {
          slug: locality,
          city: { name: { equals: city, mode: 'insensitive' } },
        },
      });
      if (loc) {
        const all = await this.prisma.lawyer.findMany({
          where,
          select: PUBLIC_SELECT,
          orderBy,
          take: 200,
        });
        const dist = (lat?: number | null, lng?: number | null) => {
          if (lat == null || lng == null) return Number.MAX_SAFE_INTEGER;
          return this.haversineKm(loc.lat, loc.lng, lat, lng);
        };
        const scored = all
          .map((l) => {
            const tagged = l.offices.some((o) => o.locality?.slug === locality);
            return { l, tagged, km: dist(l.latitude, l.longitude) };
          })
          .sort((a, b) => {
            if (a.tagged !== b.tagged) return a.tagged ? -1 : 1;
            return a.km - b.km;
          });
        const total = scored.length;
        const items = scored
          .slice((page - 1) * limit, page * limit)
          .map((x) => ({
            ...x.l,
            nearLocality: x.tagged || x.km <= 7 ? loc.name : null,
            localityKm:
              x.km === Number.MAX_SAFE_INTEGER
                ? null
                : Math.round(x.km * 10) / 10,
          }));
        return {
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
    }

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
      city,
      practiceArea,
      courtId,
      experienceMin,
      experienceMax,
      language,
      gender,
      ratingMin,
      swLat,
      swLng,
      neLat,
      neLng,
      lat,
      lng,
      radiusKm,
    } = query;

    const where = this.buildWhere({
      city,
      practiceArea,
      courtId,
      experienceMin,
      experienceMax,
      language,
      gender,
      ratingMin,
      swLat,
      swLng,
      neLat,
      neLng,
    });

    const markers = await this.prisma.lawyer.findMany({
      where,
      select: MARKER_SELECT,
      take: 200,
    });

    if (lat === undefined || lng === undefined) return markers;

    return markers
      .map((m) => ({
        ...m,
        distanceKm:
          m.latitude == null || m.longitude == null
            ? null
            : Math.round(
                this.haversineKm(lat, lng, m.latitude, m.longitude) * 10,
              ) / 10,
      }))
      .filter(
        (m) =>
          radiusKm === undefined ||
          (m.distanceKm !== null && m.distanceKm <= radiusKm),
      )
      .sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
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
    subscribed?: boolean;
  }): Prisma.LawyerWhereInput {
    const {
      city,
      practiceArea,
      courtId,
      experienceMin,
      experienceMax,
      language,
      gender,
      ratingMin,
      swLat,
      swLng,
      neLat,
      neLng,
    } = params;

    return {
      verificationStatus: VerificationStatus.APPROVED,
      ...(params.subscribed
        ? {
            subscriptionStatus: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
            },
          }
        : {}),
      ...(city
        ? {
            OR: [
              { city: { is: { name: { equals: city, mode: 'insensitive' } } } },
              {
                serviceAreas: {
                  some: {
                    active: true,
                    city: { name: { equals: city, mode: 'insensitive' } },
                  },
                },
              },
            ],
          }
        : {}),
      ...(practiceArea
        ? {
            practiceAreas: {
              some: {
                practiceArea: {
                  name: { equals: practiceArea, mode: 'insensitive' },
                },
              },
            },
          }
        : {}),
      ...(courtId ? { courts: { some: { courtId } } } : {}),
      ...(experienceMin !== undefined
        ? { experienceYears: { gte: experienceMin } }
        : {}),
      ...(experienceMax !== undefined
        ? { experienceYears: { lte: experienceMax } }
        : {}),
      ...(language
        ? {
            languages: {
              some: {
                language: { name: { equals: language, mode: 'insensitive' } },
              },
            },
          }
        : {}),
      ...(gender ? { gender } : {}),
      ...(ratingMin !== undefined ? { ratingAvg: { gte: ratingMin } } : {}),
      ...(swLat !== undefined && neLat !== undefined
        ? { latitude: { gte: swLat, lte: neLat } }
        : {}),
      ...(swLng !== undefined && neLng !== undefined
        ? { longitude: { gte: swLng, lte: neLng } }
        : {}),
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

  /** Public: practice area reference list (homepage grid, search dropdowns). */
  listCourts() {
    return this.prisma.court.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, code: true, type: true },
    });
  }

  listLanguages() {
    return this.prisma.language.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  listPracticeAreas() {
    return this.prisma.practiceArea.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  // ---------------- Practice areas (admin config) ----------------

  /** Admin: areas with usage counts so deletes can be reasoned about. */
  async adminListPracticeAreas() {
    const areas = await this.prisma.practiceArea.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { lawyers: true } } },
    });
    return areas.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      lawyerCount: a._count.lawyers,
    }));
  }

  async createPracticeArea(name: string) {
    const slug = this.slugify(name);
    const existing = await this.prisma.practiceArea.findFirst({
      where: { OR: [{ slug }, { name }] },
    });
    if (existing) {
      throw new ConflictException(`Practice area "${name}" already exists`);
    }
    return this.prisma.practiceArea.create({ data: { name, slug } });
  }

  /** Rename only — the slug stays stable so SEO landing URLs never break. */
  async renamePracticeArea(id: string, name: string) {
    const area = await this.prisma.practiceArea.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('Practice area not found');
    const clash = await this.prisma.practiceArea.findFirst({
      where: { name, NOT: { id } },
    });
    if (clash) throw new ConflictException(`"${name}" already exists`);
    return this.prisma.practiceArea.update({ where: { id }, data: { name } });
  }

  /** Delete is blocked while lawyers still reference the area. */
  async deletePracticeArea(id: string) {
    const area = await this.prisma.practiceArea.findUnique({
      where: { id },
      include: { _count: { select: { lawyers: true } } },
    });
    if (!area) throw new NotFoundException('Practice area not found');
    if (area._count.lawyers > 0) {
      throw new ConflictException(
        `${area._count.lawyers} lawyer(s) still list "${area.name}" — reassign them first`,
      );
    }
    await this.prisma.practiceArea.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Public city autocomplete: prefix matches rank before substring matches.
   * Powers the city fields on the homepage hero and search filters.
   */
  // Common colloquial / legacy names -> official seeded city names, so a user
  // typing "trichy" or "bangalore" still finds the city.
  private static readonly CITY_ALIASES: Record<string, string> = {
    trichy: 'Tiruchirappalli',
    tirupur: 'Tiruppur',
    bangalore: 'Bengaluru',
    bombay: 'Mumbai',
    madras: 'Chennai',
    calcutta: 'Kolkata',
    gurgaon: 'Gurugram',
    vizag: 'Visakhapatnam',
    trivandrum: 'Thiruvananthapuram',
    pondicherry: 'Puducherry',
    pondy: 'Puducherry',
    cochin: 'Kochi',
    mysore: 'Mysuru',
    mangalore: 'Mangaluru',
    baroda: 'Vadodara',
    allahabad: 'Prayagraj',
    banaras: 'Varanasi',
    benares: 'Varanasi',
    belgaum: 'Belagavi',
    hubli: 'Hubballi',
    hospet: 'Hosapete',
    kgf: 'Kolar Gold Fields',
    berhampur: 'Brahmapur',
    panjim: 'Panaji',
    udhagamandalam: 'Ooty',
  };

  // Metros surfaced first when the input is focused but still empty.
  private static readonly POPULAR_CITIES = [
    'Chennai',
    'Bengaluru',
    'Mumbai',
    'Delhi',
    'Kolkata',
    'Hyderabad',
    'Pune',
    'Ahmedabad',
  ];

  // Empty query -> popular metros first, then more cities alphabetically
  // (LawRato-style "click to browse"). Non-empty -> alias-aware search.
  // State reference list (public) — canonical source for content state-applicability.
  listStates() {
    return this.prisma.state.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  // Metro locality reference list for a city (public). Empty for non-metros —
  // the frontend hides the locality filter when this returns [].
  async listLocalities(cityName: string) {
    if (!cityName?.trim()) return [];
    const city = await this.prisma.city.findFirst({
      where: { name: { equals: cityName.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    if (!city) return [];
    return this.prisma.locality.findMany({
      where: { cityId: city.id },
      select: { id: true, name: true, slug: true, lat: true, lng: true },
      orderBy: { name: 'asc' },
    });
  }

  async suggestCities(q: string, limit = 10) {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      const select = {
        id: true,
        name: true,
        district: {
          select: { name: true, state: { select: { name: true, code: true } } },
        },
      } as const;
      const popular = await this.prisma.city.findMany({
        where: { name: { in: LawyersService.POPULAR_CITIES } },
        select,
      });
      const order = LawyersService.POPULAR_CITIES;
      popular.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
      const rest = await this.prisma.city.findMany({
        where: { name: { notIn: LawyersService.POPULAR_CITIES } },
        select,
        orderBy: { name: 'asc' },
        take: Math.max(limit * 2 - popular.length, 0),
      });
      return [...popular, ...rest].map((c) => ({
        id: c.id,
        name: c.name,
        state: c.district.state.name,
        stateCode: c.district.state.code,
        popular: order.includes(c.name),
      }));
    }
    // Alias-aware: match the typed text OR any official name whose alias
    // starts with the typed text ("tri" -> Trichy -> Tiruchirappalli).
    const lowerQ = query.toLowerCase();
    const aliasTargets = Object.entries(LawyersService.CITY_ALIASES)
      .filter(([alias]) => alias.startsWith(lowerQ))
      .map(([, official]) => official);
    const cities = await this.prisma.city.findMany({
      where: aliasTargets.length
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { name: { in: aliasTargets } },
            ],
          }
        : { name: { contains: query, mode: 'insensitive' } },
      take: limit * 2,
      select: {
        id: true,
        name: true,
        district: {
          select: { name: true, state: { select: { name: true, code: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    const lower = query.toLowerCase();
    return cities
      .sort((a, b) => {
        const ap = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name);
      })
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        name: c.name,
        state: c.district.state.name,
        stateCode: c.district.state.code,
      }));
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

  // ---------------- Offices & service areas (docs/28) ----------------

  private async getLawyerByUserId(userId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { userId } });
    if (!lawyer) {
      throw new NotFoundException(
        'Lawyer profile not found — complete onboarding first',
      );
    }
    return lawyer;
  }

  /** Lawyer: offices, active service areas, and the plan's cap in one call. */
  /** Replace an office's photo set (max 3, images only). */
  async setOfficePhotos(
    userId: string,
    officeId: string,
    photos: Express.Multer.File[],
  ) {
    const lawyer = await this.getLawyerByUserId(userId);
    const office = await this.prisma.lawyerOffice.findFirst({
      where: { id: officeId, lawyerId: lawyer.id },
    });
    if (!office) throw new NotFoundException('Office not found');
    if (photos.length === 0) {
      throw new BadRequestException('Attach at least one photo');
    }
    for (const ph of photos) {
      if (!ph.mimetype?.startsWith('image/')) {
        throw new BadRequestException(
          'Office photos must be images (JPG/PNG/WebP)',
        );
      }
      if (ph.size > 2 * 1024 * 1024) {
        throw new BadRequestException(
          'Each office photo must be 2 MB or smaller',
        );
      }
    }
    const urls: string[] = [];
    for (const ph of photos.slice(0, 3)) {
      urls.push(await this.storage.upload(ph, 'offices'));
    }
    return this.prisma.lawyerOffice.update({
      where: { id: office.id },
      data: { photoUrls: urls },
      include: { city: { select: { id: true, name: true } } },
    });
  }

  async getMyLocations(userId: string) {
    const lawyer = await this.getLawyerByUserId(userId);
    const [offices, serviceAreas, planPrice] = await Promise.all([
      this.prisma.lawyerOffice.findMany({
        where: { lawyerId: lawyer.id },
        orderBy: { isPrimary: 'desc' },
        include: { city: { select: { id: true, name: true } } },
      }),
      this.prisma.lawyerServiceArea.findMany({
        where: { lawyerId: lawyer.id, active: true },
        include: { city: { select: { id: true, name: true } } },
      }),
      this.prisma.subscriptionPlanPrice.findUnique({
        where: {
          planName:
            lawyer.subscriptionStatus === 'ACTIVE'
              ? ((
                  await this.prisma.subscription.findFirst({
                    where: { lawyerId: lawyer.id, status: 'ACTIVE' },
                    orderBy: { startDate: 'desc' },
                    select: { planName: true },
                  })
                )?.planName ?? 'BASIC')
              : 'BASIC',
        },
      }),
    ]);
    return {
      offices,
      serviceAreas: serviceAreas.map((sa) => sa.city),
      maxServiceAreas: planPrice?.maxServiceAreas ?? null, // null = unlimited
    };
  }

  private async findCityByName(cityName: string) {
    const city = await this.prisma.city.findFirst({
      where: { name: { equals: cityName.trim(), mode: 'insensitive' } },
    });
    if (!city) {
      throw new BadRequestException(
        `Unknown city "${cityName}" — pick one from the suggestions`,
      );
    }
    return city;
  }

  // Bios are public marketing surface — links invite spam/SEO abuse and look
  // broken on cards. Reject any URL-ish content outright.
  private assertBioClean(bio?: string | null) {
    if (bio && /(https?:\/\/|www\.)/i.test(bio)) {
      throw new BadRequestException(
        'Links are not allowed in the bio — describe your practice in plain words',
      );
    }
  }

  // Locality must belong to the office city; anything else is dropped quietly.
  private async validLocalityId(
    localityId: string | undefined,
    cityId: string,
  ): Promise<string | null> {
    if (!localityId) return null;
    const loc = await this.prisma.locality.findFirst({
      where: { id: localityId, cityId },
      select: { id: true },
    });
    return loc ? loc.id : null;
  }

  async addOffice(
    userId: string,
    dto: {
      city: string;
      label?: string;
      addressLine?: string;
      pincode?: string;
      landmark?: string;
      localityId?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const lawyer = await this.getLawyerByUserId(userId);
    const city = await this.findCityByName(dto.city);
    const localityId = await this.validLocalityId(dto.localityId, city.id);
    const count = await this.prisma.lawyerOffice.count({
      where: { lawyerId: lawyer.id },
    });
    return this.prisma.lawyerOffice.create({
      data: {
        lawyerId: lawyer.id,
        cityId: city.id,
        label: dto.label ?? null,
        addressLine: dto.addressLine ?? null,
        pincode: dto.pincode ?? null,
        landmark: dto.landmark ?? null,
        localityId,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        isPrimary: count === 0, // first office is automatically primary
      },
      include: { city: { select: { id: true, name: true } } },
    });
  }

  async updateOffice(
    userId: string,
    officeId: string,
    dto: {
      city?: string;
      label?: string;
      addressLine?: string;
      pincode?: string;
      landmark?: string;
      localityId?: string;
      latitude?: number;
      longitude?: number;
      isPrimary?: boolean;
    },
  ) {
    const lawyer = await this.getLawyerByUserId(userId);
    const office = await this.prisma.lawyerOffice.findFirst({
      where: { id: officeId, lawyerId: lawyer.id },
    });
    if (!office) throw new NotFoundException('Office not found');

    const city = dto.city ? await this.findCityByName(dto.city) : null;

    const localityId =
      dto.localityId !== undefined
        ? await this.validLocalityId(
            dto.localityId,
            city ? city.id : office.cityId,
          )
        : undefined;

    const updated = await this.prisma.lawyerOffice.update({
      where: { id: office.id },
      data: {
        ...(localityId !== undefined ? { localityId } : {}),
        ...(city ? { cityId: city.id } : {}),
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.addressLine !== undefined
          ? { addressLine: dto.addressLine }
          : {}),
        ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
        ...(dto.landmark !== undefined ? { landmark: dto.landmark } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.isPrimary ? { isPrimary: true } : {}),
      },
      include: { city: { select: { id: true, name: true } } },
    });

    if (dto.isPrimary) {
      // single primary + keep the denormalized Lawyer city/coords in sync
      await this.prisma.$transaction([
        this.prisma.lawyerOffice.updateMany({
          where: { lawyerId: lawyer.id, id: { not: office.id } },
          data: { isPrimary: false },
        }),
        this.prisma.lawyer.update({
          where: { id: lawyer.id },
          data: {
            cityId: updated.city.id,
            latitude: updated.latitude,
            longitude: updated.longitude,
          },
        }),
      ]);
    }
    return updated;
  }

  async deleteOffice(userId: string, officeId: string) {
    const lawyer = await this.getLawyerByUserId(userId);
    const office = await this.prisma.lawyerOffice.findFirst({
      where: { id: officeId, lawyerId: lawyer.id },
    });
    if (!office) throw new NotFoundException('Office not found');
    const count = await this.prisma.lawyerOffice.count({
      where: { lawyerId: lawyer.id },
    });
    if (count <= 1) {
      throw new BadRequestException(
        'You need at least one office — add another before removing this one',
      );
    }
    if (office.isPrimary) {
      throw new BadRequestException(
        'Make another office primary before removing this one',
      );
    }
    await this.prisma.lawyerOffice.delete({ where: { id: office.id } });
    return { deleted: true };
  }

  /** Replace the active service-area list; validated against the plan cap (docs/28 §7). */
  async setServiceAreas(userId: string, cityNames: string[]) {
    const lawyer = await this.getLawyerByUserId(userId);
    const unique = [...new Set(cityNames.map((c) => c.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one service area');
    }

    // cap by current plan (TRIAL/EXPIRED fall back to the BASIC cap)
    const activeSub = await this.prisma.subscription.findFirst({
      where: { lawyerId: lawyer.id, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      select: { planName: true },
    });
    const planPrice = await this.prisma.subscriptionPlanPrice.findUnique({
      where: { planName: activeSub?.planName ?? 'BASIC' },
    });
    const cap = planPrice?.maxServiceAreas ?? null;
    if (cap !== null && unique.length > cap) {
      throw new BadRequestException(
        `Your plan allows up to ${cap} service areas — upgrade to add more`,
      );
    }

    const cities = await Promise.all(
      unique.map((name) => this.findCityByName(name)),
    );

    await this.prisma.$transaction([
      this.prisma.lawyerServiceArea.deleteMany({
        where: { lawyerId: lawyer.id },
      }),
      this.prisma.lawyerServiceArea.createMany({
        data: cities.map((c) => ({
          lawyerId: lawyer.id,
          cityId: c.id,
          active: true,
        })),
        skipDuplicates: true,
      }),
    ]);

    return { serviceAreas: cities.map((c) => ({ id: c.id, name: c.name })) };
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

  /**
   * Approval queue — subscribed (paying) lawyers first, then oldest first.
   * Paying while pending buys priority review, never auto-approval.
   */
  /**
   * Admin: full lawyer directory — any verification status, searchable,
   * sortable by name / mobile / status / newest. Includes contact + areas.
   */
  async adminListLawyers(
    status?: string,
    q?: string,
    sort?: string,
    page?: string | number,
    pageSize?: string | number,
  ) {
    if (status === 'AWAITING_ONBOARDING') {
      return this.listAwaitingOnboarding(q, sort, page, pageSize);
    }
    const query = q?.trim();
    const where: Prisma.LawyerWhereInput = {
      ...(status && status !== 'ALL'
        ? status === 'PENDING'
          ? {
              verificationStatus: {
                in: [
                  VerificationStatus.PENDING,
                  VerificationStatus.UNDER_REVIEW,
                ],
              },
            }
          : { verificationStatus: status as VerificationStatus }
        : {}),
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { barCouncilNumber: { contains: query, mode: 'insensitive' } },
              { barCouncilState: { contains: query, mode: 'insensitive' } },
              {
                user: {
                  is: { email: { contains: query, mode: 'insensitive' } },
                },
              },
              { user: { is: { mobile: { contains: query } } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.LawyerOrderByWithRelationInput[] =
      sort === 'name'
        ? [{ fullName: 'asc' }]
        : sort === 'mobile'
          ? [{ user: { mobile: 'asc' } }]
          : sort === 'status'
            ? [{ verificationStatus: 'asc' }, { fullName: 'asc' }]
            : [{ createdAt: 'desc' }]; // newest (default)

    const pg = resolvePagination(page, pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lawyer.findMany({
        where,
        orderBy,
        skip: pg.skip,
        take: pg.take,
        select: {
          id: true,
          fullName: true,
          slug: true,
          barCouncilNumber: true,
          barCouncilState: true,
          experienceYears: true,
          verificationStatus: true,
          subscriptionStatus: true,
          certificateImageUrl: true,
          ratingAvg: true,
          ratingCount: true,
          createdAt: true,
          approvedAt: true,
          user: { select: { email: true, mobile: true, status: true } },
          city: { select: { name: true } },
          practiceAreas: {
            select: { practiceArea: { select: { name: true } } },
          },
        },
      }),
      this.prisma.lawyer.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
  }

  /** Lawyer-role users who registered but never submitted a profile. */
  private async listAwaitingOnboarding(
    q?: string,
    sort?: string,
    page?: string | number,
    pageSize?: string | number,
  ) {
    const query = q?.trim();
    const where: Prisma.UserWhereInput = {
      role: Role.LAWYER,
      lawyer: null,
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { mobile: { contains: query } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput =
      sort === 'name'
        ? { fullName: 'asc' }
        : sort === 'mobile'
          ? { mobile: 'asc' }
          : sort === 'status'
            ? { status: 'asc' }
            : { createdAt: 'desc' };
    const pg = resolvePagination(page, pageSize);
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: pg.skip,
        take: pg.take,
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      users.map((u) => this.awaitingOnboardingRow(u)),
      total,
      pg.page,
      pg.pageSize,
    );
  }

  /** Shape a profile-less lawyer user like an admin lawyer row. */
  private awaitingOnboardingRow(u: {
    id: string;
    fullName: string | null;
    email: string;
    mobile: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: u.id, // User id — no Lawyer row exists yet
      fullName: u.fullName ?? u.email,
      slug: null,
      barCouncilNumber: '',
      barCouncilState: '',
      experienceYears: 0,
      verificationStatus: 'AWAITING_ONBOARDING',
      subscriptionStatus: 'TRIAL',
      certificateImageUrl: '',
      ratingAvg: null,
      ratingCount: 0,
      createdAt: u.createdAt,
      approvedAt: null,
      user: { email: u.email, mobile: u.mobile, status: u.status },
      city: null,
      practiceAreas: [] as { practiceArea: { name: string } }[],
    };
  }

  /** Single lawyer for the admin review page; falls back to awaiting-onboarding users. */
  async adminGetLawyer(id: string) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        slug: true,
        barCouncilNumber: true,
        barCouncilState: true,
        experienceYears: true,
        verificationStatus: true,
        subscriptionStatus: true,
        certificateImageUrl: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        approvedAt: true,
        user: { select: { email: true, mobile: true, status: true } },
        city: { select: { name: true } },
        practiceAreas: {
          select: { practiceArea: { select: { name: true } } },
        },
        profileImageUrl: true,
        bio: true,
        offices: {
          select: {
            id: true,
            label: true,
            addressLine: true,
            pincode: true,
            landmark: true,
            latitude: true,
            longitude: true,
            isPrimary: true,
            city: { select: { name: true } },
          },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });
    if (lawyer) return lawyer;

    const u = await this.prisma.user.findFirst({
      where: { id, role: Role.LAWYER, lawyer: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        status: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException('Lawyer not found');
    return this.awaitingOnboardingRow(u);
  }

  async listPending(
    q?: string,
    page?: string | number,
    pageSize?: string | number,
  ) {
    const query = q?.trim();
    const where: Prisma.LawyerWhereInput = {
      verificationStatus: {
        in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
      },
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { barCouncilNumber: { contains: query, mode: 'insensitive' } },
              { barCouncilState: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const pg = resolvePagination(page, pageSize);
    // ACTIVE (paying) sorts first — enum values are alphabetical, so 'asc' puts
    // ACTIVE ahead of CANCELLED/EXPIRED/TRIAL — then oldest-first within a tier.
    // Doing it in SQL keeps the "paid first" ordering correct across pages.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lawyer.findMany({
        where,
        orderBy: [{ subscriptionStatus: 'asc' }, { createdAt: 'asc' }],
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.lawyer.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
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
      const trialDays = await this.settings.getNumber('TRIAL_DAYS', TRIAL_DAYS);
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
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

    await this.audit.log(`LAWYER_${dto.status}`, {
      entityType: 'Lawyer',
      entityId: lawyerId,
      summary: `${lawyer.fullName} (${lawyer.barCouncilNumber}) → ${dto.status}${dto.comments ? ` — ${dto.comments}` : ''}`,
      oldValue: { verificationStatus: lawyer.verificationStatus },
      newValue: { verificationStatus: dto.status },
    });

    // Notify the lawyer in-app + email (docs/02: rejection must be actionable).
    if (dto.status === VerificationStatus.APPROVED) {
      await this.mail.sendLawyerApproved(lawyer.user.email);
      await this.prisma.notification.create({
        data: {
          userId: lawyer.userId,
          channel: 'IN_APP',
          type: 'VERIFICATION_APPROVED',
          payloadJson: {
            title: 'You are verified — profile is live',
            body: 'Clients can now find you in search and send leads.',
          },
        },
      });
    } else if (dto.status === VerificationStatus.REJECTED) {
      await this.mail.sendLawyerRejected(
        lawyer.user.email,
        dto.comments ?? undefined,
      );
      await this.prisma.notification.create({
        data: {
          userId: lawyer.userId,
          channel: 'IN_APP',
          type: 'VERIFICATION_REJECTED',
          payloadJson: {
            title: 'Verification rejected — action needed',
            body: `${dto.comments?.trim() || 'Your submitted documents could not be verified.'} Re-upload a proper Bar Council ID card from your dashboard and resubmit.`,
          },
        },
      });
    }

    return updated;
  }

  /** Update the profile headshot (approved lawyers can refresh it anytime). */
  async updateProfilePhoto(userId: string, photo?: Express.Multer.File) {
    const lawyer = await this.getLawyerByUserId(userId);
    if (!photo) throw new BadRequestException('Attach a photo');
    if (!photo.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Profile photo must be an image (JPG/PNG/WebP)',
      );
    }
    if (photo.size > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'Photo is too large — maximum size is 2 MB',
      );
    }
    const profileImageUrl = await this.storage.upload(photo, 'profiles');
    return this.prisma.lawyer.update({
      where: { id: lawyer.id },
      data: { profileImageUrl },
      select: { id: true, profileImageUrl: true },
    });
  }

  /** Rejected lawyer fixes documents and re-enters the pending queue. */
  async resubmitVerification(userId: string, files: LawyerProfileFiles) {
    const lawyer = await this.getLawyerByUserId(userId);
    if (lawyer.verificationStatus !== VerificationStatus.REJECTED) {
      throw new BadRequestException(
        'Only rejected profiles can be resubmitted for review',
      );
    }
    const certFile = files.certificate?.[0];
    const photoFile = files.photo?.[0];
    if (!certFile && !photoFile) {
      throw new BadRequestException(
        'Upload a corrected Bar Council ID card (or photo) before resubmitting',
      );
    }
    if (photoFile && !photoFile.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Profile photo must be an image (JPG/PNG/WebP)',
      );
    }

    const certificateImageUrl = certFile
      ? await this.storage.upload(certFile, 'certificates')
      : lawyer.certificateImageUrl;
    if (photoFile && photoFile.size > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'Profile photo is too large — maximum size is 2 MB',
      );
    }
    const profileImageUrl = photoFile
      ? await this.storage.upload(photoFile, 'profiles')
      : undefined;

    const [updated] = await this.prisma.$transaction([
      this.prisma.lawyer.update({
        where: { id: lawyer.id },
        data: {
          certificateImageUrl,
          ...(profileImageUrl ? { profileImageUrl } : {}),
          verificationStatus: VerificationStatus.PENDING,
        },
      }),
      this.prisma.verification.create({
        data: {
          lawyerId: lawyer.id,
          documentType: 'BAR_COUNCIL_CERTIFICATE',
          documentUrl: certificateImageUrl,
          status: VerificationStatus.PENDING,
        },
      }),
    ]);

    await this.notify.notifyAdmins('LAWYER_RESUBMITTED', {
      title: `${lawyer.fullName} resubmitted documents`,
      body: 'Previously rejected — the corrected ID card is ready for re-review.',
      link: `/admin/approvals/${lawyer.id}`,
    });

    return updated;
  }
}
