import { Injectable, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertLandingDto } from './dto/upsert-landing.dto';

@Injectable()
export class SeoService {
  constructor(private prisma: PrismaService) {}

  /**
   * URL feed for building XML sitemaps in the frontend (or an XML route).
   * Only APPROVED lawyers are exposed; each item carries a `lastmod` for change-detection.
   */
  async sitemapFeed() {
    const [lawyers, cities, practiceAreas] = await Promise.all([
      this.prisma.lawyer.findMany({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          slug: { not: null },
        },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.city.findMany({ select: { name: true } }),
      this.prisma.practiceArea.findMany({ select: { slug: true, name: true } }),
    ]);

    return {
      lawyers: lawyers.map((l) => ({
        url: `/lawyer/${l.slug}`,
        lastmod: l.updatedAt,
      })),
      cities: cities.map((c) => ({ url: `/lawyers/${slugify(c.name)}` })),
      practiceAreas: practiceAreas.map((p) => ({
        url: `/lawyers/practice/${p.slug}`,
        name: p.name,
      })),
    };
  }

  /** Editable landing copy for a city × practice page (falls back to a generated default). */
  async getLanding(citySlug: string, practiceSlug: string) {
    const content = await this.prisma.landingContent.findUnique({
      where: { citySlug_practiceSlug: { citySlug, practiceSlug } },
    });
    if (content) return content;

    // sensible default so a page always renders even before copy is authored
    const city = title(citySlug);
    const practice = title(practiceSlug);
    return {
      citySlug,
      practiceSlug,
      title: `${practice} Lawyers in ${city}`,
      intro: `Find Bar Council–verified ${practice.toLowerCase()} lawyers in ${city}. Compare experience and client ratings, then submit your requirement — the advocate contacts you directly.`,
      faqJson: [],
      generated: true,
    };
  }

  upsertLanding(citySlug: string, practiceSlug: string, dto: UpsertLandingDto) {
    return this.prisma.landingContent.upsert({
      where: { citySlug_practiceSlug: { citySlug, practiceSlug } },
      create: {
        citySlug,
        practiceSlug,
        title: dto.title,
        intro: dto.intro,
        faqJson: dto.faq ?? [],
      },
      update: {
        title: dto.title,
        intro: dto.intro,
        ...(dto.faq !== undefined ? { faqJson: dto.faq } : {}),
      },
    });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function title(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
