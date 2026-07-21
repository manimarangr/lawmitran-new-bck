import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, ContentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminContentQueryDto,
  ContentCategoryDto,
  ContentCreateDto,
  ContentUpdateDto,
  PublicContentQueryDto,
  ReviewerCreateDto,
  ReviewerUpdateDto,
  SetContentStatusDto,
} from './dto/content.dto';

// Legal workflow: which transitions are allowed from each status.
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  IN_REVIEW: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED', 'DRAFT'],
  ARCHIVED: ['DRAFT', 'PUBLISHED'],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90)
    .replace(/^-|-$/g, '');
}

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────── public reads ───────────────────────

  // Only PUBLISHED items whose publishedAt has passed (or is null) are visible.
  private publicWhere(q: PublicContentQueryDto): Prisma.ContentItemWhereInput {
    const where: Prisma.ContentItemWhereInput = {
      status: ContentStatus.PUBLISHED,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    };
    if (q.type) where.type = q.type as ContentType;
    if (q.category) where.categorySlug = q.category;
    if (q.tag) where.tags = { has: q.tag };
    if (q.state) where.states = { has: q.state };
    if (q.q) {
      where.AND = [
        {
          OR: [
            { title: { contains: q.q, mode: 'insensitive' } },
            { excerpt: { contains: q.q, mode: 'insensitive' } },
            { tags: { has: q.q } },
          ],
        },
      ];
    }
    return where;
  }

  async listPublic(q: PublicContentQueryDto) {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 20, 50);
    const where = this.publicWhere(q);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.contentItem.count({ where }),
      this.prisma.contentItem.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { reviewer: true },
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      items: items.map((i) => this.toPublic(i)),
    };
  }

  async getPublicBySlug(slug: string) {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      include: { reviewer: true },
    });
    if (!item) throw new NotFoundException('Content not found');
    return this.toPublic(item);
  }

  // Shape sent to the public frontend. Never leak the fake "reviewer": when
  // none is assigned we surface an explicit "To Be Assigned" placeholder.
  private toPublic(
    i: Prisma.ContentItemGetPayload<{ include: { reviewer: true } }>,
  ) {
    return {
      id: i.id,
      type: i.type,
      slug: i.slug,
      title: i.title,
      excerpt: i.excerpt,
      bodyHtml: i.bodyHtml,
      sections: i.sections,
      faqs: i.faqs,
      seoTitle: i.seoTitle ?? i.title,
      metaDescription: i.metaDescription ?? i.excerpt ?? undefined,
      canonicalUrl: i.canonicalUrl ?? undefined,
      ogImageUrl: i.ogImageUrl ?? i.featuredImageUrl ?? undefined,
      featuredImageUrl: i.featuredImageUrl ?? undefined,
      jsonLd: i.jsonLd ?? undefined,
      categorySlug: i.categorySlug,
      tags: i.tags,
      practiceAreas: i.practiceAreas,
      states: i.states,
      relatedDocumentIds: i.relatedDocumentIds,
      relatedLawyerIds: i.relatedLawyerIds,
      authorName: i.authorName ?? 'LawMitran Legal Content Team',
      readMinutes: i.readMinutes ?? undefined,
      publishedAt: i.publishedAt,
      updatedAt: i.updatedAt,
      reviewState: i.reviewState,
      reviewer: i.reviewer
        ? {
            name: i.reviewer.name,
            designation: i.reviewer.designation,
            barCouncilNumber: i.reviewer.barCouncilNumber,
            practiceAreas: i.reviewer.practiceAreas,
            photoUrl: i.reviewer.photoUrl,
          }
        : { name: 'To Be Assigned', designation: 'Pending Legal Review' },
    };
  }

  async publicCategories(type?: string) {
    return this.prisma.contentCategory.findMany({
      where: type ? { type: type as ContentType } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ─────────────────────── admin reads ───────────────────────

  async adminList(q: AdminContentQueryDto) {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 25, 100);
    const where: Prisma.ContentItemWhereInput = {};
    if (q.type) where.type = q.type as ContentType;
    if (q.status) where.status = q.status as ContentStatus;
    // Dashboard bucket filter. SCHEDULED / PUBLISHED are both status
    // PUBLISHED, split on publishedAt relative to now.
    if (q.bucket) {
      const now = new Date();
      if (q.bucket === 'SCHEDULED') {
        where.status = ContentStatus.PUBLISHED;
        where.publishedAt = { gt: now };
      } else if (q.bucket === 'PUBLISHED') {
        where.status = ContentStatus.PUBLISHED;
        where.OR = [{ publishedAt: null }, { publishedAt: { lte: now } }];
      } else {
        where.status = q.bucket as ContentStatus;
      }
    }
    if (q.category) where.categorySlug = q.category;
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { slug: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    const [total, items] = await this.prisma.$transaction([
      this.prisma.contentItem.count({ where }),
      this.prisma.contentItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { reviewer: { select: { id: true, name: true } } },
      }),
    ]);
    return { total, page, pageSize, pages: Math.ceil(total / pageSize), items };
  }

  async adminGet(id: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
      include: { reviewer: true },
    });
    if (!item) throw new NotFoundException('Content not found');
    return item;
  }

  // Dashboard counts for the Legal Help Center landing screen.
  // SCHEDULED is derived: PUBLISHED items whose publishedAt is in the future.
  async adminDashboard(type?: string) {
    const now = new Date();
    const base: Prisma.ContentItemWhereInput = type
      ? { type: type as ContentType }
      : {};
    const [drafts, inReview, scheduled, published, archived] =
      await this.prisma.$transaction([
        this.prisma.contentItem.count({
          where: { ...base, status: ContentStatus.DRAFT },
        }),
        this.prisma.contentItem.count({
          where: { ...base, status: ContentStatus.IN_REVIEW },
        }),
        this.prisma.contentItem.count({
          where: {
            ...base,
            status: ContentStatus.PUBLISHED,
            publishedAt: { gt: now },
          },
        }),
        this.prisma.contentItem.count({
          where: {
            ...base,
            status: ContentStatus.PUBLISHED,
            OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
          },
        }),
        this.prisma.contentItem.count({
          where: { ...base, status: ContentStatus.ARCHIVED },
        }),
      ]);
    // groupBy runs outside the $transaction array: Prisma's batch typing
    // requires orderBy there and loses _count inference (TS2345/TS2339).
    const byType = await this.prisma.contentItem.groupBy({
      by: ['type'],
      _count: { _all: true },
      orderBy: { type: 'asc' },
    });
    return {
      buckets: { drafts, inReview, scheduled, published, archived },
      total: drafts + inReview + scheduled + published + archived,
      byType: byType.map((t) => ({ type: t.type, count: t._count._all })),
    };
  }

  // ─────────────────────── admin writes ───────────────────────

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = slugify(base) || 'item';
    let candidate = root;
    let n = 1;
    // Loop until the slug is free (excluding the row being updated).

    while (true) {
      const clash = await this.prisma.contentItem.findFirst({
        where: {
          slug: candidate,
          ...(ignoreId ? { id: { not: ignoreId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${root}-${n}`;
    }
  }

  async create(dto: ContentCreateDto, userId?: string) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    return this.prisma.contentItem.create({
      data: {
        type: dto.type as ContentType,
        status: ContentStatus.DRAFT,
        slug,
        title: dto.title,
        excerpt: dto.excerpt,
        bodyHtml: dto.bodyHtml ?? '',
        sections: (dto.sections ?? undefined) as
          Prisma.InputJsonValue | undefined,
        faqs: dto.faqs ?? undefined,
        seoTitle: dto.seoTitle,
        metaDescription: dto.metaDescription,
        canonicalUrl: dto.canonicalUrl,
        ogImageUrl: dto.ogImageUrl,
        featuredImageUrl: dto.featuredImageUrl,
        jsonLd: (dto.jsonLd ?? undefined) as Prisma.InputJsonValue | undefined,
        categorySlug: dto.categorySlug,
        tags: dto.tags ?? [],
        practiceAreas: dto.practiceAreas ?? [],
        states: dto.states ?? [],
        relatedDocumentIds: dto.relatedDocumentIds ?? [],
        relatedLawyerIds: dto.relatedLawyerIds ?? [],
        authorName: dto.authorName,
        reviewerId: dto.reviewerId || null,
        reviewState: (dto.reviewState as never) ?? undefined,
        readMinutes: dto.readMinutes,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(id: string, dto: ContentUpdateDto, userId?: string) {
    const existing = await this.prisma.contentItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Content not found');

    // Snapshot the current state before mutating (revision history).
    await this.prisma.contentRevision.create({
      data: {
        contentId: id,
        editorId: userId,
        note: dto.revisionNote,
        snapshot: existing,
      },
    });

    const data: Prisma.ContentItemUpdateInput = { updatedById: userId };
    if (dto.type !== undefined) data.type = dto.type as ContentType;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = await this.uniqueSlug(dto.slug, id);
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.bodyHtml !== undefined) data.bodyHtml = dto.bodyHtml;
    if (dto.sections !== undefined)
      data.sections = dto.sections as Prisma.InputJsonValue;
    if (dto.faqs !== undefined) data.faqs = dto.faqs;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.metaDescription !== undefined)
      data.metaDescription = dto.metaDescription;
    if (dto.canonicalUrl !== undefined) data.canonicalUrl = dto.canonicalUrl;
    if (dto.ogImageUrl !== undefined) data.ogImageUrl = dto.ogImageUrl;
    if (dto.featuredImageUrl !== undefined)
      data.featuredImageUrl = dto.featuredImageUrl;
    if (dto.jsonLd !== undefined)
      data.jsonLd = dto.jsonLd as Prisma.InputJsonValue;
    if (dto.categorySlug !== undefined) data.categorySlug = dto.categorySlug;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.practiceAreas !== undefined) data.practiceAreas = dto.practiceAreas;
    if (dto.states !== undefined) data.states = dto.states;
    if (dto.relatedDocumentIds !== undefined)
      data.relatedDocumentIds = dto.relatedDocumentIds;
    if (dto.relatedLawyerIds !== undefined)
      data.relatedLawyerIds = dto.relatedLawyerIds;
    if (dto.authorName !== undefined) data.authorName = dto.authorName;
    if (dto.reviewerId !== undefined)
      data.reviewer = dto.reviewerId
        ? { connect: { id: dto.reviewerId } }
        : { disconnect: true };
    if (dto.reviewState !== undefined)
      data.reviewState = dto.reviewState as never;
    if (dto.readMinutes !== undefined) data.readMinutes = dto.readMinutes;

    return this.prisma.contentItem.update({ where: { id }, data });
  }

  async setStatus(id: string, dto: SetContentStatusDto, userId?: string) {
    const existing = await this.prisma.contentItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Content not found');

    const from = existing.status;
    const to = dto.status as ContentStatus;
    if (from !== to && !(TRANSITIONS[from] ?? []).includes(to)) {
      throw new BadRequestException(`Illegal transition ${from} -> ${to}`);
    }

    const data: Prisma.ContentItemUpdateInput = {
      status: to,
      updatedById: userId,
    };
    if (to === ContentStatus.PUBLISHED) {
      // Explicit date = schedule (may be future); otherwise publish now,
      // preserving an earlier publish date if one already exists.
      data.publishedAt = dto.publishedAt
        ? new Date(dto.publishedAt)
        : (existing.publishedAt ?? new Date());
    }
    return this.prisma.contentItem.update({ where: { id }, data });
  }

  async revisions(id: string) {
    await this.adminGet(id);
    return this.prisma.contentRevision.findMany({
      where: { contentId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─────────────────────── reviewers ───────────────────────

  reviewerList() {
    return this.prisma.reviewer.findMany({ orderBy: { name: 'asc' } });
  }

  reviewerCreate(dto: ReviewerCreateDto) {
    return this.prisma.reviewer.create({
      data: {
        name: dto.name,
        designation: dto.designation,
        barCouncilNumber: dto.barCouncilNumber,
        practiceAreas: dto.practiceAreas ?? [],
        biography: dto.biography,
        photoUrl: dto.photoUrl,
        lawyerId: dto.lawyerId || null,
        active: dto.active ?? true,
      },
    });
  }

  async reviewerUpdate(id: string, dto: ReviewerUpdateDto) {
    const existing = await this.prisma.reviewer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reviewer not found');
    return this.prisma.reviewer.update({
      where: { id },
      data: {
        name: dto.name,
        designation: dto.designation,
        barCouncilNumber: dto.barCouncilNumber,
        practiceAreas: dto.practiceAreas,
        biography: dto.biography,
        photoUrl: dto.photoUrl,
        lawyerId: dto.lawyerId,
        active: dto.active,
      },
    });
  }

  // Promote a verified, APPROVED Lawyer into a Reviewer (idempotent by lawyerId).
  async reviewerFromLawyer(lawyerId: string) {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { id: lawyerId },
    });
    if (!lawyer) throw new NotFoundException('Lawyer not found');
    if (lawyer.verificationStatus !== 'APPROVED') {
      throw new BadRequestException(
        'Only APPROVED lawyers can become reviewers',
      );
    }
    const existing = await this.prisma.reviewer.findUnique({
      where: { lawyerId },
    });
    if (existing) return existing;
    return this.prisma.reviewer.create({
      data: {
        name: lawyer.fullName,
        lawyerId,
        active: true,
        practiceAreas: [],
      },
    });
  }

  // ─────────────────────── categories ───────────────────────

  categoryList(type?: string) {
    return this.prisma.contentCategory.findMany({
      where: type ? { type: type as ContentType } : undefined,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  categoryUpsert(dto: ContentCategoryDto) {
    return this.prisma.contentCategory.upsert({
      where: { type_slug: { type: dto.type as ContentType, slug: dto.slug } },
      update: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
      },
      create: {
        type: dto.type as ContentType,
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }
}
