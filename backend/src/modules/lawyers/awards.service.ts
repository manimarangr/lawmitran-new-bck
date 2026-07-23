import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadStatus, Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Criteria-based platform awards — see docs/27-awards-and-recognition.md.
 * Computed per calendar year; recompute is idempotent (upserts, add-only).
 */
const CLIENTS_CHOICE_MIN_RATINGS = Number(
  process.env.AWARD_CC_MIN_RATINGS ?? 10,
);
const CLIENTS_CHOICE_MIN_AVG = Number(process.env.AWARD_CC_MIN_AVG ?? 4.5);
const TOP_RESPONDER_MIN_SERVED = Number(process.env.AWARD_TR_MIN_SERVED ?? 20);
const TOP_RESPONDER_MIN_CONFIRMED = Number(
  process.env.AWARD_TR_MIN_CONFIRMED ?? 5,
);
const RISING_STAR_MIN_RATINGS = Number(process.env.AWARD_RS_MIN_RATINGS ?? 5);
const RISING_STAR_MIN_AVG = Number(process.env.AWARD_RS_MIN_AVG ?? 4.0);

const TITLES: Record<string, string> = {
  CLIENTS_CHOICE: "Client's Choice",
  TOP_RESPONDER: 'Top Responder',
  RISING_STAR: 'Rising Star',
};

@Injectable()
export class AwardsService {
  private readonly logger = new Logger(AwardsService.name);

  constructor(private prisma: PrismaService) {}

  /** Every 1 January 02:00 — award the year that just ended. */
  @Cron('0 2 1 1 *')
  async computePreviousYear() {
    const year = new Date().getFullYear() - 1;
    this.logger.log(`Annual award computation for ${year}`);
    return this.computeAwardsForYear(year);
  }

  /**
   * Evaluate every APPROVED lawyer against the documented criteria for `year`
   * and grant any newly-qualified awards. Never removes existing awards.
   */
  async computeAwardsForYear(year: number) {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));

    const lawyers = await this.prisma.lawyer.findMany({
      where: { verificationStatus: VerificationStatus.APPROVED },
      select: { id: true, createdAt: true },
    });

    let granted = 0;
    for (const lawyer of lawyers) {
      const [ratingAgg, served, confirmed] = await Promise.all([
        this.prisma.rating.aggregate({
          where: { lawyerId: lawyer.id, createdAt: { gte: from, lt: to } },
          _count: { _all: true },
          _avg: { score: true },
        }),
        this.prisma.lead.count({
          where: {
            lawyerId: lawyer.id,
            status: { in: [LeadStatus.CONTACTED, LeadStatus.CLOSED] },
            createdAt: { gte: from, lt: to },
          },
        }),
        this.prisma.lead.count({
          where: {
            lawyerId: lawyer.id,
            clientConfirmedAt: { gte: from, lt: to },
          },
        }),
      ]);

      const ratings = ratingAgg._count._all;
      const avg = ratingAgg._avg.score ?? 0;

      if (
        ratings >= CLIENTS_CHOICE_MIN_RATINGS &&
        avg >= CLIENTS_CHOICE_MIN_AVG
      ) {
        granted += await this.grant(lawyer.id, 'CLIENTS_CHOICE', year, {
          ratings,
          avg: Math.round(avg * 100) / 100,
        });
      }

      if (
        served >= TOP_RESPONDER_MIN_SERVED &&
        confirmed >= TOP_RESPONDER_MIN_CONFIRMED
      ) {
        granted += await this.grant(lawyer.id, 'TOP_RESPONDER', year, {
          leadsServed: served,
          clientConfirmed: confirmed,
        });
      }

      const joinedThisYear = lawyer.createdAt >= from && lawyer.createdAt < to;
      if (
        joinedThisYear &&
        ratings >= RISING_STAR_MIN_RATINGS &&
        avg >= RISING_STAR_MIN_AVG
      ) {
        granted += await this.grant(lawyer.id, 'RISING_STAR', year, {
          ratings,
          avg: Math.round(avg * 100) / 100,
          joined: lawyer.createdAt.toISOString(),
        });
      }
    }

    this.logger.log(`Award computation for ${year}: ${granted} new award(s)`);
    return { year, lawyersEvaluated: lawyers.length, newAwards: granted };
  }

  /** Idempotent grant — returns 1 only when the award is newly created. */
  private async grant(
    lawyerId: string,
    type: 'CLIENTS_CHOICE' | 'TOP_RESPONDER' | 'RISING_STAR',
    year: number,
    criteria: Prisma.InputJsonValue,
  ): Promise<number> {
    const existing = await this.prisma.lawyerAward.findUnique({
      where: { lawyerId_type_year: { lawyerId, type, year } },
    });
    if (existing) return 0;
    await this.prisma.lawyerAward.create({
      data: {
        lawyerId,
        type,
        year,
        title: TITLES[type],
        criteriaJson: criteria,
      },
    });
    return 1;
  }
}
