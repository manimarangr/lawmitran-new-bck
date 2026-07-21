import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export interface DutyResult {
  duty: number;
  mode: 'estimate' | 'strict';
  note?: string;
  rateFound: boolean;
}

interface RateLike {
  calcType: string;
  flatAmount: unknown;
  percent: unknown;
  minAmount: unknown;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/**
 * State x document-type stamp-duty calculator. Admin-gated by
 * DOCS_STAMP_DUTY_ENABLED; DOCS_STAMP_DUTY_MODE picks estimate (never blocks)
 * vs strict (missing state/rate blocks checkout). Rates are admin-editable.
 */
@Injectable()
export class StampDutyService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async computeForTemplate(
    template: { requiresStamp: boolean; stampBasis: string | null },
    opts: { state?: string; declaredValue?: number },
  ): Promise<DutyResult> {
    const mode =
      (await this.settings.get('DOCS_STAMP_DUTY_MODE')) === 'strict'
        ? 'strict'
        : 'estimate';
    const enabled = await this.settings.getBool(
      'DOCS_STAMP_DUTY_ENABLED',
      false,
    );
    if (!enabled || !template.requiresStamp || !template.stampBasis) {
      return { duty: 0, mode, rateFound: false };
    }

    const state = opts.state?.trim().toUpperCase();
    if (!state) {
      if (mode === 'strict') {
        throw new BadRequestException('Select a state to compute stamp duty');
      }
      return {
        duty: 0,
        mode,
        rateFound: false,
        note: 'Select a state for a stamp-duty estimate.',
      };
    }

    const rate = await this.prisma.stampDutyRate.findFirst({
      where: { state, documentType: template.stampBasis, active: true },
    });
    if (!rate) {
      if (mode === 'strict') {
        throw new BadRequestException(
          `Stamp-duty rate not configured for ${state}`,
        );
      }
      return {
        duty: 0,
        mode,
        rateFound: false,
        note: `Stamp-duty rate not configured for ${state}; shown as 0 (estimate).`,
      };
    }

    return {
      duty: this.compute(rate, opts.declaredValue),
      mode,
      rateFound: true,
    };
  }

  private compute(rate: RateLike, declaredValue?: number): number {
    if (rate.calcType === 'FLAT') return num(rate.flatAmount);
    // PERCENT / SLAB (slab approximated as percent with a minimum floor).
    const raw = ((declaredValue ?? 0) * num(rate.percent)) / 100;
    return Math.max(Math.round(raw), num(rate.minAmount));
  }

  // ---------------- admin (OPS) ----------------

  adminList() {
    return this.prisma.stampDutyRate.findMany({
      orderBy: [{ state: 'asc' }, { documentType: 'asc' }],
    });
  }

  adminUpsert(dto: {
    state: string;
    documentType: string;
    calcType: string;
    flatAmount?: number;
    percent?: number;
    minAmount?: number;
    active?: boolean;
  }) {
    const state = dto.state.trim().toUpperCase();
    const data = {
      calcType: dto.calcType,
      flatAmount: dto.flatAmount ?? null,
      percent: dto.percent ?? null,
      minAmount: dto.minAmount ?? null,
      active: dto.active ?? true,
    };
    return this.prisma.stampDutyRate.upsert({
      where: { state_documentType: { state, documentType: dto.documentType } },
      update: data,
      create: { state, documentType: dto.documentType, ...data },
    });
  }

  async adminUpdate(
    id: string,
    dto: Partial<{
      calcType: string;
      flatAmount: number | null;
      percent: number | null;
      minAmount: number | null;
      active: boolean;
    }>,
  ) {
    const exists = await this.prisma.stampDutyRate.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Stamp-duty rate not found');
    return this.prisma.stampDutyRate.update({
      where: { id },
      data: { ...dto },
    });
  }
}
