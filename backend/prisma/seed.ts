import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Subscription duration tiers (PathLegal-style: 30 days / 3 / 6 / 12 months).
 * Longer terms are discounted to push annual commitment.
 * Prices are in INR (exclusive of GST).
 */
const PLAN_TIERS: Array<{
  planName: string;
  durationDays: number;
  label: string;
  amount: number;
}> = [
  // Basic — base ₹499/mo
  { planName: 'BASIC', durationDays: 30, label: '30 days', amount: 499 },
  { planName: 'BASIC', durationDays: 90, label: '3 months', amount: 1349 },
  { planName: 'BASIC', durationDays: 180, label: '6 months', amount: 2549 },
  { planName: 'BASIC', durationDays: 365, label: '1 year', amount: 4790 },
  // Premium — base ₹1,499/mo
  { planName: 'PREMIUM', durationDays: 30, label: '30 days', amount: 1499 },
  { planName: 'PREMIUM', durationDays: 90, label: '3 months', amount: 4049 },
  { planName: 'PREMIUM', durationDays: 180, label: '6 months', amount: 7649 },
  { planName: 'PREMIUM', durationDays: 365, label: '1 year', amount: 14390 },
];

// Base monthly price + monthly lead cap per plan (null = unlimited).
const PLAN_BASE_PRICE: Array<{
  planName: string;
  amount: number;
  monthlyLeadCap: number | null;
}> = [
  { planName: 'BASIC', amount: 499, monthlyLeadCap: 25 },
  { planName: 'PREMIUM', amount: 1499, monthlyLeadCap: null },
];

async function main() {
  for (const p of PLAN_BASE_PRICE) {
    await prisma.subscriptionPlanPrice.upsert({
      where: { planName: p.planName },
      create: p,
      update: { amount: p.amount, monthlyLeadCap: p.monthlyLeadCap },
    });
  }

  for (const t of PLAN_TIERS) {
    await prisma.subscriptionPlanTier.upsert({
      where: {
        planName_durationDays: {
          planName: t.planName,
          durationDays: t.durationDays,
        },
      },
      create: t,
      update: { label: t.label, amount: t.amount, active: true },
    });
  }

  console.log(
    `Seeded ${PLAN_BASE_PRICE.length} base prices and ${PLAN_TIERS.length} plan tiers.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
