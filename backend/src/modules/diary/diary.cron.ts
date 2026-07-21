import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../../common/notify/notify.service';

/**
 * Case Diary daily digests (in-app only — Phase 1).
 * Runs at 07:00 server time: "hearing tomorrow" for every case whose next
 * hearing falls tomorrow, and "reminder due today" for open reminders.
 * Each item fires exactly once (the job looks at a single day's window).
 */
@Injectable()
export class DiaryCronService {
  private readonly logger = new Logger(DiaryCronService.name);

  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
  ) {}

  @Cron('0 7 * * *')
  async dailyDigest() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    // Hearings tomorrow
    const hearings = await this.prisma.diaryCase.findMany({
      where: {
        deletedAt: null,
        nextHearingAt: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      select: {
        id: true,
        title: true,
        courtName: true,
        nextHearingAt: true,
        lawyer: { select: { userId: true } },
      },
    });
    for (const c of hearings) {
      await this.notify.notifyUser(c.lawyer.userId, 'DIARY_HEARING_TOMORROW', {
        title: `Hearing tomorrow: ${c.title}`,
        body: c.courtName ?? undefined,
        link: `/dashboard/diary/cases/${c.id}`,
      });
    }

    // Reminders due today
    const reminders = await this.prisma.diaryReminder.findMany({
      where: {
        deletedAt: null,
        done: false,
        dueAt: { gte: todayStart, lte: todayEnd },
      },
      select: {
        id: true,
        notes: true,
        type: true,
        lawyer: { select: { userId: true } },
        case: { select: { id: true, title: true } },
      },
    });
    for (const r of reminders) {
      await this.notify.notifyUser(r.lawyer.userId, 'DIARY_REMINDER_DUE', {
        title: `Reminder due today: ${r.notes ?? r.type.replace('_', ' ').toLowerCase()}`,
        body: r.case?.title,
        link: r.case
          ? `/dashboard/diary/cases/${r.case.id}`
          : '/dashboard/diary/reminders',
      });
    }

    if (hearings.length || reminders.length) {
      this.logger.log(
        `Diary digest: ${hearings.length} hearing alert(s), ${reminders.length} reminder alert(s)`,
      );
    }
  }
}
