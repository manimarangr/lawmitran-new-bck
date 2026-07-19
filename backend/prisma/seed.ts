import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Default admin account (admins cannot self-register).
 * Override via env: ADMIN_EMAIL, ADMIN_MOBILE, ADMIN_PASSWORD.
 */
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@lawmitran.local',
  mobile: process.env.ADMIN_MOBILE ?? '+919999999999',
  password: process.env.ADMIN_PASSWORD ?? 'Admin@12345',
};

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
  maxServiceAreas: number | null;
}> = [
  { planName: 'BASIC', amount: 499, monthlyLeadCap: 25, maxServiceAreas: 3 },
  { planName: 'PREMIUM', amount: 1499, monthlyLeadCap: null, maxServiceAreas: 10 },
];

async function main() {
  // Default admin (admins can't self-register through /auth/register).
  const passwordHash = await bcrypt.hash(ADMIN.password, 12);
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    create: {
      email: ADMIN.email,
      mobile: ADMIN.mobile,
      passwordHash,
      role: Role.ADMIN,
      adminRole: 'SUPER',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      mobileVerified: true,
    },
    update: { role: Role.ADMIN,
      adminRole: 'SUPER', status: UserStatus.ACTIVE },
  });
  console.log(`Seeded admin: ${ADMIN.email}`);

  for (const p of PLAN_BASE_PRICE) {
    await prisma.subscriptionPlanPrice.upsert({
      where: { planName: p.planName },
      create: p,
      update: {
        amount: p.amount,
        monthlyLeadCap: p.monthlyLeadCap,
        maxServiceAreas: p.maxServiceAreas,
      },
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

  await seedLocations();
  await seedLocalities();
  await seedPracticeAreas();
  await seedCourts();
  await seedLanguages();
  await seedPropertyChecklists();
}

/** Practice area reference data — powers search filters, hero dropdown, landing pages. */
const COURTS: { name: string; code: string; type: string }[] = [
  { name: 'Supreme Court of India', code: 'SC', type: 'SUPREME' },
  { name: 'Allahabad High Court', code: 'HC-ALL', type: 'HIGH_COURT' },
  { name: 'Andhra Pradesh High Court', code: 'HC-AP', type: 'HIGH_COURT' },
  { name: 'Bombay High Court', code: 'HC-BOM', type: 'HIGH_COURT' },
  { name: 'Calcutta High Court', code: 'HC-CAL', type: 'HIGH_COURT' },
  { name: 'Chhattisgarh High Court', code: 'HC-CG', type: 'HIGH_COURT' },
  { name: 'Delhi High Court', code: 'HC-DEL', type: 'HIGH_COURT' },
  { name: 'Gauhati High Court', code: 'HC-GAU', type: 'HIGH_COURT' },
  { name: 'Gujarat High Court', code: 'HC-GUJ', type: 'HIGH_COURT' },
  { name: 'Himachal Pradesh High Court', code: 'HC-HP', type: 'HIGH_COURT' },
  { name: 'High Court of Jammu & Kashmir and Ladakh', code: 'HC-JK', type: 'HIGH_COURT' },
  { name: 'Jharkhand High Court', code: 'HC-JHA', type: 'HIGH_COURT' },
  { name: 'Karnataka High Court', code: 'HC-KAR', type: 'HIGH_COURT' },
  { name: 'Kerala High Court', code: 'HC-KER', type: 'HIGH_COURT' },
  { name: 'Madhya Pradesh High Court', code: 'HC-MP', type: 'HIGH_COURT' },
  { name: 'Madras High Court', code: 'HC-MAD', type: 'HIGH_COURT' },
  { name: 'Manipur High Court', code: 'HC-MAN', type: 'HIGH_COURT' },
  { name: 'Meghalaya High Court', code: 'HC-MEG', type: 'HIGH_COURT' },
  { name: 'Orissa High Court', code: 'HC-ORI', type: 'HIGH_COURT' },
  { name: 'Patna High Court', code: 'HC-PAT', type: 'HIGH_COURT' },
  { name: 'Punjab & Haryana High Court', code: 'HC-PH', type: 'HIGH_COURT' },
  { name: 'Rajasthan High Court', code: 'HC-RAJ', type: 'HIGH_COURT' },
  { name: 'Sikkim High Court', code: 'HC-SIK', type: 'HIGH_COURT' },
  { name: 'Telangana High Court', code: 'HC-TS', type: 'HIGH_COURT' },
  { name: 'Tripura High Court', code: 'HC-TRI', type: 'HIGH_COURT' },
  { name: 'Uttarakhand High Court', code: 'HC-UK', type: 'HIGH_COURT' },
  { name: 'District & Sessions Court', code: 'DISTRICT', type: 'DISTRICT' },
  { name: 'Family Court', code: 'FAMILY', type: 'DISTRICT' },
  { name: 'Consumer Forum (DCDRC/SCDRC/NCDRC)', code: 'CONSUMER', type: 'TRIBUNAL' },
  { name: 'Labour Court / Industrial Tribunal', code: 'LABOUR', type: 'TRIBUNAL' },
  { name: 'National Company Law Tribunal (NCLT)', code: 'NCLT', type: 'TRIBUNAL' },
  { name: 'Debt Recovery Tribunal (DRT)', code: 'DRT', type: 'TRIBUNAL' },
  { name: 'Income Tax Appellate Tribunal (ITAT)', code: 'ITAT', type: 'TRIBUNAL' },
  { name: 'Central Administrative Tribunal (CAT)', code: 'CAT', type: 'TRIBUNAL' },
  { name: 'Motor Accident Claims Tribunal (MACT)', code: 'MACT', type: 'TRIBUNAL' },
];

// ---- Property Document Check (docs/29) — deterministic checklists ----
const DOC = {
  saleDeed: { key: 'saleDeed', label: 'Sale Deed', why: 'The registered deed transferring ownership — the primary title document.' },
  motherDeed: { key: 'motherDeed', label: 'Mother Deed', why: 'Traces how the seller got the property; establishes the chain of title.' },
  ec: { key: 'ec', label: 'Encumbrance Certificate (EC)', why: 'Shows registered mortgages/charges — ask for 30 years for a clean chain.' },
  khataCertificate: { key: 'khataCertificate', label: 'Khata Certificate', why: 'Confirms the property is entered in municipal records in the seller\u2019s name (A-Khata preferred).' },
  khataExtract: { key: 'khataExtract', label: 'Khata Extract', why: 'Details of the municipal assessment — size, use, tax basis.' },
  rtc: { key: 'rtc', label: 'RTC / Pahani', why: 'Record of rights for (formerly) agricultural land — shows cultivator/owner history.' },
  pattaChitta: { key: 'pattaChitta', label: 'Patta / Chitta', why: 'State revenue record of ownership and land classification (Tamil Nadu).' },
  surveySketch: { key: 'surveySketch', label: 'Survey Sketch', why: 'Confirms boundaries and extent match what you are buying.' },
  layoutApproval: { key: 'layoutApproval', label: 'Layout Approval', why: 'Proves the layout was sanctioned by the planning authority — unapproved layouts are risky.' },
  dcConversion: { key: 'dcConversion', label: 'Land Conversion Order (DC Conversion)', why: 'Agricultural land must be converted before residential use.' },
  mutationRecords: { key: 'mutationRecords', label: 'Mutation Records', why: 'Shows revenue records were updated after past transfers.' },
  taxReceipts: { key: 'taxReceipts', label: 'Latest Tax Paid Receipts', why: 'Confirms no property-tax arrears and supports possession.' },
  buildingPlanApproval: { key: 'buildingPlanApproval', label: 'Building Plan Approval', why: 'The construction must match the sanctioned plan.' },
  occupancyCertificate: { key: 'occupancyCertificate', label: 'Occupancy Certificate (OC)', why: 'Certifies the building is fit for occupation — banks insist on it.' },
} as const;

const req = (d: { key: string; label: string; why: string }) => ({ ...d, required: true });
const opt = (d: { key: string; label: string; why: string }) => ({ ...d, required: false });

const PROPERTY_CHECKLISTS: { state: string; transactionType: string; items: object[] }[] = [
  {
    state: 'Karnataka',
    transactionType: 'FLAT_PURCHASE',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.khataCertificate),
      req(DOC.khataExtract), req(DOC.taxReceipts), req(DOC.buildingPlanApproval),
      req(DOC.occupancyCertificate), opt(DOC.dcConversion), opt(DOC.layoutApproval),
    ],
  },
  {
    state: 'Karnataka',
    transactionType: 'SITE_PURCHASE',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.khataCertificate),
      req(DOC.khataExtract), req(DOC.taxReceipts), req(DOC.layoutApproval),
      req(DOC.dcConversion), req(DOC.surveySketch), opt(DOC.mutationRecords), opt(DOC.rtc),
    ],
  },
  {
    state: 'Karnataka',
    transactionType: 'RESALE_HOUSE',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.khataCertificate),
      req(DOC.khataExtract), req(DOC.taxReceipts), req(DOC.buildingPlanApproval),
      opt(DOC.occupancyCertificate), opt(DOC.surveySketch), opt(DOC.mutationRecords),
    ],
  },
  {
    state: 'Karnataka',
    transactionType: 'AGRICULTURAL_LAND',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.rtc),
      req(DOC.mutationRecords), req(DOC.surveySketch), req(DOC.taxReceipts),
    ],
  },
  {
    state: 'Tamil Nadu',
    transactionType: 'SITE_PURCHASE',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.pattaChitta),
      req(DOC.taxReceipts), req(DOC.layoutApproval), req(DOC.surveySketch), opt(DOC.mutationRecords),
    ],
  },
  {
    state: 'ANY',
    transactionType: 'OTHER',
    items: [
      req(DOC.saleDeed), req(DOC.motherDeed), req(DOC.ec), req(DOC.taxReceipts),
      opt(DOC.surveySketch), opt(DOC.mutationRecords), opt(DOC.khataCertificate),
    ],
  },
];

async function seedPropertyChecklists() {
  for (const c of PROPERTY_CHECKLISTS) {
    await prisma.propertyChecklist.upsert({
      where: { state_transactionType: { state: c.state, transactionType: c.transactionType } },
      update: { items: c.items },
      create: { state: c.state, transactionType: c.transactionType, items: c.items },
    });
  }
  console.log(`Seeded ${PROPERTY_CHECKLISTS.length} property checklists`);
}

async function seedCourts() {
  for (const c of COURTS) {
    await prisma.court.upsert({
      where: { code: c.code },
      update: { name: c.name, type: c.type },
      create: c,
    });
  }
  console.log(`Seeded ${COURTS.length} courts`);
}

const LANGUAGES: { name: string; code: string }[] = [
  { name: 'English', code: 'en' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Telugu', code: 'te' },
  { name: 'Malayalam', code: 'ml' },
  { name: 'Marathi', code: 'mr' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Bengali', code: 'bn' },
  { name: 'Punjabi', code: 'pa' },
  { name: 'Odia', code: 'or' },
  { name: 'Assamese', code: 'as' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Konkani', code: 'kok' },
  { name: 'Bhojpuri', code: 'bho' },
  { name: 'Rajasthani', code: 'raj' },
];

async function seedLanguages() {
  for (const l of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name },
      create: l,
    });
  }
  console.log(`Seeded ${LANGUAGES.length} languages`);
}

async function seedPracticeAreas() {
  const AREAS = [
    'Family Law', 'Criminal Law', 'Property Law', 'Civil Law',
    'Corporate Law', 'Consumer Law', 'Employment Law', 'Tax Law',
    'Intellectual Property', 'Immigration', 'Banking & Finance', 'Cyber Law',
    'Motor Accident Claims', 'Cheque Bounce', 'Divorce', 'Documentation',
  ];
  for (const name of AREAS) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    await prisma.practiceArea.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    });
  }
  console.log(`Seeded ${AREAS.length} practice areas.`);
}

/**
 * India location reference data: every state/UT, all districts, and cities.
 * Cities = one per district (district name cleaned of Urban/Rural/etc. suffixes)
 * plus a curated list of major cities whose name differs from their district
 * (Bengaluru → Bengaluru Urban, Kochi → Ernakulam, Noida → Gautam Buddha Nagar…).
 * Powers city autocomplete + SEO landing pages. Idempotent (upserts only).
 */
async function seedLocations() {
  const dataDir = path.join(__dirname, 'data');
  const { states } = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'india-states-districts.json'), 'utf8'),
  ) as { states: Array<{ name: string; code: string; districts: string[] }> };
  const { cities: majorCities } = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'india-major-cities.json'), 'utf8'),
  ) as { cities: Array<{ name: string; district: string; stateCode: string }> };

  let cityCount = 0;

  for (const st of states) {
    const state = await prisma.state.upsert({
      where: { code: st.code },
      create: { name: st.name, code: st.code },
      update: { name: st.name },
    });

    for (const districtName of st.districts) {
      const district = await prisma.district.upsert({
        where: { stateId_name: { stateId: state.id, name: districtName } },
        create: { stateId: state.id, name: districtName },
        update: {},
      });

      const cityName = deriveCityName(districtName);
      if (cityName) {
        await prisma.city.upsert({
          where: { districtId_name: { districtId: district.id, name: cityName } },
          create: { districtId: district.id, name: cityName },
          update: {},
        });
        cityCount++;
      }
    }
  }

  // Curated major cities (name differs from the district).
  for (const c of majorCities) {
    const state = await prisma.state.findUnique({ where: { code: c.stateCode } });
    if (!state) continue;
    const district = await prisma.district.findUnique({
      where: { stateId_name: { stateId: state.id, name: c.district } },
    });
    if (!district) {
      console.warn(`Seed: district "${c.district}" (${c.stateCode}) not found for city ${c.name}`);
      continue;
    }
    await prisma.city.upsert({
      where: { districtId_name: { districtId: district.id, name: c.name } },
      create: { districtId: district.id, name: c.name },
      update: {},
    });
    cityCount++;
  }

  console.log(
    `Seeded ${states.length} states/UTs, all districts, and ~${cityCount} cities.`,
  );
}

/**
 * Metro localities (Electronic City, Tambaram, Andheri...) with centroid
 * coordinates — locality filter on lawyer search + future SEO landings.
 * Idempotent (upsert by cityId+slug). Metro-only by design.
 */
async function seedLocalities() {
  const dataDir = path.join(__dirname, 'data');
  const { localities } = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'india-metro-localities.json'), 'utf8'),
  ) as { localities: Record<string, Array<[string, number, number]>> };

  let count = 0;
  for (const [cityName, list] of Object.entries(localities)) {
    const city = await prisma.city.findFirst({ where: { name: cityName } });
    if (!city) {
      console.warn(`Seed: metro city "${cityName}" not found — run seedLocations first`);
      continue;
    }
    for (const [name, lat, lng] of list) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      await prisma.locality.upsert({
        where: { cityId_slug: { cityId: city.id, slug } },
        create: { cityId: city.id, name, slug, lat, lng },
        update: { name, lat, lng },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} metro localities.`);
}

/**
 * District → headquarters-city name. Returns null for districts that should
 * not produce a derived city (their metro twin is covered by the curated list).
 */
function deriveCityName(district: string): string | null {
  // "Bengaluru Rural", "Mumbai Suburban" → covered by curated Bengaluru/Mumbai
  if (/ Rural$| Suburban$/.test(district)) return null;
  let name = district
    .replace(/\s*\(.*?\)\s*/g, ' ') // drop parenthetical alt names
    .replace(/ (Urban|City|Metropolitan)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name.length > 1 ? name : null;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
