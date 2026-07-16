/**
 * Phase 3 seed: indicative stamp-duty rates by state x document type.
 * Idempotent - upserts by (state, documentType). Values are ESTIMATES to tune
 * in Admin -> Settings; verify against current state rules before relying on them.
 *
 *   npm run seed:stamp-duty --workspace backend
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Rate {
  state: string;
  documentType: string; // matches DocumentTemplate.stampBasis
  calcType: 'FLAT' | 'PERCENT';
  flatAmount?: number;
  percent?: number;
  minAmount?: number;
}

// Indicative launch data. FLAT for rental agreements (commonly nominal);
// PERCENT examples show the calc for value-based instruments.
const RATES: Rate[] = [
  { state: 'KA', documentType: 'rental-agreement', calcType: 'FLAT', flatAmount: 500 },
  { state: 'MH', documentType: 'rental-agreement', calcType: 'FLAT', flatAmount: 500 },
  { state: 'DL', documentType: 'rental-agreement', calcType: 'FLAT', flatAmount: 100 },
  { state: 'TN', documentType: 'rental-agreement', calcType: 'FLAT', flatAmount: 200 },
  { state: 'UP', documentType: 'rental-agreement', calcType: 'FLAT', flatAmount: 200 },
  // Value-based examples (no template uses these yet; here to exercise PERCENT):
  { state: 'KA', documentType: 'sale-deed', calcType: 'PERCENT', percent: 5, minAmount: 500 },
  { state: 'KA', documentType: 'gift-deed', calcType: 'PERCENT', percent: 5, minAmount: 500 },
];

async function main() {
  for (const r of RATES) {
    await prisma.stampDutyRate.upsert({
      where: { state_documentType: { state: r.state, documentType: r.documentType } },
      update: {
        calcType: r.calcType,
        flatAmount: r.flatAmount ?? null,
        percent: r.percent ?? null,
        minAmount: r.minAmount ?? null,
        active: true,
      },
      create: {
        state: r.state,
        documentType: r.documentType,
        calcType: r.calcType,
        flatAmount: r.flatAmount ?? null,
        percent: r.percent ?? null,
        minAmount: r.minAmount ?? null,
      },
    });
    console.log(`rate: ${r.state}/${r.documentType} (${r.calcType})`);
  }
  console.log('Stamp-duty seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
