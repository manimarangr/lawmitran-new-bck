/**
 * Curated legal-guidance knowledge base (docs/12 — P0, deterministic).
 * General information only — never case-specific advice. Admin-editable in P1.
 * `practiceMatch` is matched (contains, insensitive) against seeded PracticeArea names;
 * `templateMatch` against document-template titles/keywords.
 */
export interface GuidanceTopic {
  key: string;
  title: string;
  practiceMatch: string;
  keywords: string[];
  summary: string;
  steps: string[];
  urgentNote?: string;
  templateMatch?: string[];
}

export const GUIDANCE_TOPICS: GuidanceTopic[] = [
  {
    key: 'cheque-bounce',
    title: 'Cheque bounce (Section 138, NI Act)',
    practiceMatch: 'cheque',
    keywords: [
      'cheque',
      'check bounce',
      'bounced',
      'dishonour',
      'dishonor',
      'insufficient funds',
      'ni act',
      '138',
    ],
    summary:
      'A bounced cheque is a criminal offence under Section 138 of the Negotiable Instruments Act. The law gives you a strict, time-bound process to recover your money.',
    steps: [
      'Collect the cheque-return memo from your bank — you need it as proof.',
      'Send a written demand notice to the drawer within 30 days of the memo.',
      'The drawer gets 15 days to pay after receiving the notice.',
      'If unpaid, a complaint must be filed in court within the next 30 days.',
    ],
    urgentNote:
      'Deadlines here are strict — missing the 30-day notice window can sink the case.',
    templateMatch: ['notice', 'cheque'],
  },
  {
    key: 'tenant-landlord',
    title: 'Tenant–landlord dispute',
    practiceMatch: 'property',
    keywords: [
      'rent',
      'tenant',
      'landlord',
      'deposit',
      'evict',
      'eviction',
      'vacate',
      'lease',
      'rental',
    ],
    summary:
      'Rental disputes — unreturned deposits, eviction threats, rent hikes — are governed by your rent agreement and the state Rent Control / Tenancy Act.',
    steps: [
      'Re-read the rent agreement: notice period, deposit terms, and lock-in clauses control most disputes.',
      'Put your demand in writing (email/WhatsApp counts) and keep proof of payments.',
      'A formal legal notice from a lawyer resolves most deposit disputes without court.',
      'If not, the rent tribunal / civil court in your city is the next step.',
    ],
    templateMatch: ['rental', 'notice'],
  },
  {
    key: 'divorce-family',
    title: 'Divorce & family matters',
    practiceMatch: 'family',
    keywords: [
      'divorce',
      'wife',
      'husband',
      'alimony',
      'custody',
      'maintenance',
      'marriage',
      'dowry',
      '498',
      'separation',
    ],
    summary:
      'Divorce can be mutual-consent (fastest — typically 6–18 months) or contested. Custody, maintenance, and property division are decided alongside.',
    steps: [
      'Gather marriage proof, financial records, and any communication that matters.',
      'Mutual consent needs a joint petition and two court motions 6+ months apart.',
      'Contested divorce needs grounds (cruelty, desertion, adultery, etc.) — evidence is key.',
      'Interim maintenance and custody can be sought while the case runs.',
    ],
    urgentNote:
      'If there is any threat to your safety, approach the police or a protection officer first.',
  },
  {
    key: 'consumer',
    title: 'Consumer complaint',
    practiceMatch: 'consumer',
    keywords: [
      'refund',
      'defective',
      'warranty',
      'consumer',
      'ecommerce',
      'delivery',
      'builder delay',
      'service deficiency',
      'insurance claim rejected',
      // online shopping — return/replacement disputes
      'amazon',
      'flipkart',
      'myntra',
      'meesho',
      'online order',
      'return it',
      'not able to return',
      'replacement',
      'seller refused',
      'wrong product',
      'fake product',
      // travel & airlines — deficiency of service under CPA 2019
      'flight',
      'airline',
      'missed flight',
      'flight cancelled',
      'flight delayed',
      'baggage',
      'travel agent',
      'tour package',
      'hotel booking',
      'train ticket',
      'overbooking',
    ],
    summary:
      'Deficient service or defective goods fall under the Consumer Protection Act, 2019. Consumer forums are designed to work without heavy legal costs.',
    steps: [
      'Complain to the seller/service provider in writing and keep the trail.',
      'Send a formal notice giving 15–30 days to resolve.',
      'File before the District (≤₹50L), State (≤₹2Cr), or National forum based on claim value.',
      'You can file online at e-daakhil.nic.in; court fees are modest.',
    ],
    templateMatch: ['consumer', 'complaint', 'notice'],
  },
  {
    key: 'criminal-fir',
    title: 'FIR, police matters & bail',
    practiceMatch: 'criminal',
    keywords: [
      'fir',
      'police',
      'arrest',
      'bail',
      'complaint against',
      'theft',
      'fraud',
      'cheating',
      '420',
      'assault',
      'threat',
    ],
    summary:
      'For cognizable offences the police must register an FIR. If someone you know is arrested, bail strategy depends on whether the offence is bailable.',
    steps: [
      'To report: file the FIR at the police station where it happened (or a zero FIR anywhere).',
      'If police refuse, escalate in writing to the SP, or a magistrate under Section 156(3) CrPC.',
      'If arrested: a bailable offence means bail is a right; otherwise a bail application is filed.',
      'Never sign statements you have not read — and involve a lawyer early.',
    ],
    urgentNote:
      'Arrest or police summons is time-critical — speak to a criminal lawyer immediately.',
  },
  {
    key: 'employment',
    title: 'Employment & salary issues',
    practiceMatch: 'employment',
    keywords: [
      'salary',
      'terminated',
      'fired',
      'notice period',
      'pf',
      'gratuity',
      'resignation',
      'employer',
      'layoff',
      'full and final',
    ],
    summary:
      'Unpaid salary, wrongful termination, and withheld full-and-final settlements are enforceable — your appointment letter and the shops & establishments / labour laws govern.',
    steps: [
      'Collect the appointment letter, payslips, and every written communication.',
      'Raise a written grievance with HR; ask for dues in a fixed timeline.',
      'A legal notice often unlocks pending settlements quickly.',
      'Next: labour commissioner (for covered employees) or civil court.',
    ],
    templateMatch: ['employment', 'notice'],
  },
  {
    key: 'property-purchase',
    title: 'Property purchase & title checks',
    practiceMatch: 'property',
    keywords: [
      'buy',
      'buying',
      'sale deed',
      'khata',
      'registration',
      'plot',
      'site',
      'flat',
      'apartment',
      'title',
      'encumbrance',
      'land',
    ],
    summary:
      'Before paying for property, verify the title chain, encumbrances, and approvals. Most disputes come from documents nobody checked.',
    steps: [
      'Collect the seller’s title documents: sale deed, mother deed, EC, khata, tax receipts.',
      'Run our free Property Document Check to see what is missing.',
      'Have a property lawyer give a written title opinion before any advance.',
      'Register the sale deed and follow up on khata transfer + mutation.',
    ],
    templateMatch: ['sale agreement', 'sale deed'],
  },
  {
    key: 'encroachment',
    title: 'Land encroachment & boundary disputes',
    practiceMatch: 'property',
    keywords: [
      'encroach',
      'encroachment',
      'boundary',
      'wall',
      'fence',
      'trespass',
      'neighbour',
      'neighbor',
      'survey dispute',
      'occupied my land',
      'grabbed',
    ],
    summary:
      'Encroachment — a neighbour building over your boundary or occupying your land — is a civil wrong. Your survey records and title documents decide it, so paper beats argument here.',
    steps: [
      'Get a licensed surveyor to measure and mark the boundary against the survey sketch.',
      'Collect your title documents (sale deed, khata/patta, tax receipts) and the survey report.',
      'Send a legal notice demanding removal of the encroachment — many disputes end here.',
      'If not, a civil suit for injunction/possession follows; do not demolish anything yourself.',
    ],
    urgentNote:
      'If construction is actively going up, act fast — an interim injunction can stop work.',
    templateMatch: ['notice'],
  },
  {
    key: 'motor-accident',
    title: 'Motor accident claims',
    practiceMatch: 'motor',
    keywords: [
      'accident',
      'hit',
      'vehicle',
      'bike',
      'car crash',
      'compensation',
      'mact',
      'insurance accident',
    ],
    summary:
      'Accident victims (or their families) can claim compensation before the Motor Accident Claims Tribunal (MACT) — no court fee is needed upfront in most states.',
    steps: [
      'Ensure an FIR is registered and collect the charge sheet copy.',
      'Preserve medical records, bills, and income proof — they decide the award.',
      'File the MACT claim in the district of the accident, your residence, or the owner’s.',
      'Insurance companies often settle once the claim is filed.',
    ],
  },
  {
    key: 'will-succession',
    title: 'Wills & inheritance',
    practiceMatch: 'documentation',
    keywords: [
      'will',
      'inheritance',
      'succession',
      'legal heir',
      'ancestral',
      'partition',
      'nominee',
      'father property',
    ],
    summary:
      'Property of a person who dies without a will devolves by succession law (Hindu Succession Act / personal law). A registered will avoids most family disputes.',
    steps: [
      'For inheritance: obtain the death certificate and legal-heir certificate first.',
      'Check for a will; if none, heirs take shares per succession law.',
      'Partition among heirs can be by mutual deed or a partition suit.',
      'Making a will? It needs two witnesses; registration adds strength.',
    ],
    templateMatch: ['will'],
  },
  {
    key: 'loans-banking',
    title: 'Loan, EMI & bank disputes',
    practiceMatch: 'banking',
    keywords: [
      'emi',
      'loan',
      'bank',
      'recovery agent',
      'credit card',
      'cibil',
      'default',
      'sarfaesi',
      'foreclosure',
      'harassment recovery',
      'ombudsman',
      'interest charged',
    ],
    summary:
      'Missed EMIs, wrong charges, and recovery-agent pressure are all governed by RBI rules and the loan agreement — banks must follow due process, and harassment is not part of it.',
    steps: [
      'Collect the loan agreement, statements, and every notice the bank sent.',
      'For wrong charges: complain in writing to the bank; unresolved in 30 days → RBI Banking Ombudsman (cms.rbi.org.in, free).',
      'For missed EMIs: banks must issue notices before classifying NPA or acting under SARFAESI — respond in writing, ask for restructuring if needed.',
      'Recovery agents may not threaten, visit odd hours, or shame you — record incidents and complain to the bank + police if it continues.',
    ],
    urgentNote:
      'Received a SARFAESI / possession notice? The reply windows are short — involve a lawyer immediately.',
    templateMatch: ['notice'],
  },
  {
    key: 'cyber',
    title: 'Cyber fraud & online harassment',
    practiceMatch: 'cyber',
    keywords: [
      'online fraud',
      'upi',
      'scam',
      'hacked',
      'otp',
      'cyber',
      'social media',
      'morphed',
      'blackmail',
      'phishing',
    ],
    summary:
      'Online financial fraud and harassment are punishable under the IT Act and IPC. Fast reporting dramatically improves fund recovery.',
    steps: [
      'Call 1930 (national cyber helpline) immediately for financial fraud — speed matters.',
      'File at cybercrime.gov.in with screenshots and transaction IDs.',
      'Ask your bank in writing to freeze/recall the disputed transfer.',
      'For harassment: preserve evidence before blocking the account.',
    ],
    urgentNote:
      'Money trail goes cold in hours — report on 1930 before anything else.',
  },
  {
    key: 'tax-notice',
    title: 'Income tax & GST notices',
    practiceMatch: 'tax',
    keywords: [
      'income tax',
      'tax notice',
      'gst',
      'tds',
      'itr',
      'tax demand',
      'tax refund',
      'gst registration',
      'gst cancelled',
      'scrutiny',
      'section 143',
      'tax raid',
      'notice from department',
    ],
    summary:
      'Tax notices carry strict reply deadlines — most are routine (mismatch, verification) and are answered online, but ignoring one converts it into a demand with penalties.',
    steps: [
      'Read the notice carefully: note the section, assessment year, and the reply deadline.',
      'Gather the matching records — returns filed, Form 26AS/AIS, invoices or GST returns.',
      'Reply online via incometax.gov.in or the GST portal within the deadline; keep the acknowledgement.',
      'For demands, scrutiny, or search cases, involve a CA or tax lawyer before replying.',
    ],
    urgentNote:
      'Reply windows on tax notices are usually 15–30 days and extensions are not guaranteed.',
  },
  {
    key: 'traffic-challan',
    title: 'Traffic challans & licence issues',
    practiceMatch: 'criminal',
    keywords: [
      'challan',
      'traffic police',
      'traffic fine',
      'driving licence',
      'licence suspended',
      'drunk driving',
      'vehicle seized',
      'e challan',
      'wrong challan',
      'helmet fine',
      'rc book',
    ],
    summary:
      'Traffic challans under the Motor Vehicles Act can be paid online or contested — many are disposed of through virtual courts without a personal appearance.',
    steps: [
      'Check the challan details on echallan.parivahan.gov.in against your vehicle and location.',
      'If correct, pay online before the due date to avoid escalation to court.',
      'If wrong (not your vehicle, duplicate, faulty camera), contest it — many states allow online representation or a virtual-court hearing.',
      'For drunk-driving charges, licence suspension, or a seized vehicle, involve a lawyer — these are court matters, not fines.',
    ],
  },
  {
    key: 'ip-trademark',
    title: 'Trademark, copyright & brand protection',
    practiceMatch: 'intellectual',
    keywords: [
      'trademark',
      'copyright',
      'patent',
      'brand name',
      'logo copied',
      'infringement',
      'brand copied',
      'design registration',
      'copied my content',
      'duplicate product',
      'counterfeit',
    ],
    summary:
      'Brand names, logos, and creative work are protected by trademark and copyright law — registration is not always mandatory for protection, but it makes enforcement far stronger.',
    steps: [
      'Preserve proof of creation and first use — dated files, invoices, launch material.',
      'Search the trademark registry (ipindia.gov.in) before adopting or disputing a mark.',
      'For copying: send a cease-and-desist notice; marketplaces also take down listings on IP complaints.',
      'File or oppose registrations within deadlines — an IP lawyer handles this end to end.',
    ],
  },
  {
    key: 'medical-negligence',
    title: 'Medical negligence & hospital disputes',
    practiceMatch: 'consumer',
    keywords: [
      'medical negligence',
      'wrong treatment',
      'hospital negligence',
      'surgery went wrong',
      'misdiagnosis',
      'doctor negligence',
      'hospital overcharged',
      'hospital bill',
      'wrong medicine',
      'died in hospital',
    ],
    summary:
      'Medical negligence claims run on records and expert opinion. Compensation is claimed through consumer forums; professional misconduct goes to the state medical council.',
    steps: [
      'Ask the hospital for the complete medical records in writing — patients are entitled to them.',
      'Get a second medical opinion documenting what should have been done differently.',
      'Complain to the state medical council for professional misconduct.',
      'File a consumer forum claim for compensation — expert evidence is usually decisive.',
    ],
  },
  {
    key: 'passport-immigration',
    title: 'Passport, visa & immigration',
    practiceMatch: 'immigration',
    keywords: [
      'passport',
      'visa',
      'oci',
      'immigration',
      'deported',
      'passport impounded',
      'police verification',
      'visa rejected',
      'nri',
      'work permit',
      'green card',
      'passport renewal',
    ],
    summary:
      'Passport and visa problems are administrative decisions with formal objection and appeal routes — most delays trace to verification issues that can be answered in writing.',
    steps: [
      'Identify the exact objection — check the status on passportindia.gov.in or the visa portal.',
      'Respond to police-verification or document objections in writing with proof.',
      'Adverse orders (refusal, impounding) can be appealed under the Passports Act within the stated window.',
      'For deportation, blacklisting, or repeated refusals, consult an immigration lawyer.',
    ],
  },
  {
    key: 'business-corporate',
    title: 'Business, partnership & company disputes',
    practiceMatch: 'corporate',
    keywords: [
      'company registration',
      'partnership dispute',
      'shareholder',
      'founder dispute',
      'llp',
      'roc',
      'business partner',
      'vendor not paying',
      'client not paying',
      'esop',
      'business contract',
      'mou',
    ],
    summary:
      'Business disputes are decided by the founding documents — partnership deed, shareholder agreement, or contract. Most agreements contain notice and arbitration clauses that must be used first.',
    steps: [
      'Collect the signed agreement/deed and all written communication on the dispute.',
      'Check for notice-period and arbitration clauses — following them is usually mandatory.',
      'Put the dispute and your demand in writing to the other side first.',
      'Unpaid invoices can also go through MSME Samadhaan (for registered MSMEs) or a summary suit — a corporate lawyer picks the fastest route.',
    ],
    templateMatch: ['nda', 'partnership'],
  },
];

/**
 * practiceMatch/practiceOverride token → canonical seeded PracticeArea name
 * (backend/prisma/seed.ts). Lawyer search filters with `equals`, so routing
 * links must carry the exact seeded name, not a fragment.
 */
export const PRACTICE_CANONICAL: Record<string, string> = {
  cheque: 'Cheque Bounce',
  property: 'Property Law',
  family: 'Family Law',
  consumer: 'Consumer Law',
  criminal: 'Criminal Law',
  employment: 'Employment Law',
  motor: 'Motor Accident Claims',
  documentation: 'Documentation',
  banking: 'Banking & Finance',
  cyber: 'Cyber Law',
  civil: 'Civil Law',
  divorce: 'Divorce',
  tax: 'Tax Law',
  immigration: 'Immigration',
  intellectual: 'Intellectual Property',
  corporate: 'Corporate Law',
};

export function canonicalPractice(token: string): string {
  const t = token.trim().toLowerCase();
  return (
    PRACTICE_CANONICAL[t] ?? token.charAt(0).toUpperCase() + token.slice(1)
  );
}

export const FALLBACK_TOPIC: GuidanceTopic = {
  key: 'general',
  title: 'Your legal question',
  practiceMatch: '',
  keywords: [],
  summary:
    'We could not confidently match this to one area of law — that usually means a lawyer should hear the details. Describing it to a verified lawyer costs nothing and they respond directly.',
  steps: [
    'Write down the timeline of events and collect any documents/messages you have.',
    'Note any deadlines (notices received, court dates, limitation periods).',
    'Submit the requirement to a verified lawyer — it is free and confidential.',
  ],
};

/** Pure keyword classifier shared by intake + lead categorization. */
export function classifyQuestion(question: string): {
  topic: GuidanceTopic;
  matched: boolean;
} {
  const q = ` ${question.toLowerCase().replace(/[^\w\s]/g, ' ')} `;
  let best: GuidanceTopic | null = null;
  let bestScore = 0;
  for (const t of GUIDANCE_TOPICS) {
    let score = 0;
    for (const kw of t.keywords) {
      if (
        q.includes(` ${kw} `) ||
        q.includes(`${kw} `) ||
        q.includes(` ${kw}`)
      ) {
        score += kw.includes(' ') ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  // One generic keyword ("land", "bank", "buy") is not enough to route confidently —
  // weak hits fall through to the AI interviewer / clarify chips instead (docs/12).
  return best && bestScore >= 2
    ? { topic: best, matched: true }
    : { topic: FALLBACK_TOPIC, matched: false };
}

// ---------- Clarify-then-route decision trees (docs/12 v2) ----------
// One chip-tap refines vague questions before any routing. Deterministic, max depth 2.

export interface ClarifyOption {
  label: string;
  /** Ask another clarifying question (depth 2, e.g. generic → family). */
  clarifyKey?: string;
  /** Final routing: which KB topic (and optional practice-area override) applies. */
  topicKey?: string;
  practiceOverride?: string;
  /** Off-ramp: the user says it isn't a legal matter — handled client-side. */
  notLegal?: boolean;
}

export interface Clarify {
  question: string;
  options: ClarifyOption[];
}

export const CLARIFIES: Record<string, Clarify> = {
  'divorce-family': {
    question:
      'Family matters cover a lot — what best describes your situation?',
    options: [
      { label: 'Divorce / separation', topicKey: 'divorce-family' },
      {
        label: 'Maintenance / money',
        topicKey: 'divorce-family',
        practiceOverride: 'family',
      },
      {
        label: 'Children / custody',
        topicKey: 'divorce-family',
        practiceOverride: 'family',
      },
      {
        label: 'Safety / domestic violence',
        topicKey: 'criminal-fir',
        practiceOverride: 'criminal',
      },
      {
        label: 'Family property dispute',
        topicKey: 'will-succession',
        practiceOverride: 'property',
      },
      { label: 'Something else', topicKey: 'general' },
    ],
  },
  money: {
    question: 'Money matters split a few ways — which is yours?',
    options: [
      { label: 'A cheque bounced', topicKey: 'cheque-bounce' },
      { label: 'Loan / EMI / bank trouble', topicKey: 'loans-banking' },
      { label: 'Recovery agents harassing me', topicKey: 'loans-banking' },
      {
        label: 'Someone owes me money',
        topicKey: 'cheque-bounce',
        practiceOverride: 'civil',
      },
      { label: 'Online / UPI fraud', topicKey: 'cyber' },
      { label: 'Something else', topicKey: 'general' },
    ],
  },
  'criminal-fir': {
    question: 'To point you right — which side of this are you on?',
    options: [
      { label: 'I want to file a complaint / FIR', topicKey: 'criminal-fir' },
      { label: 'Someone filed against me / arrest', topicKey: 'criminal-fir' },
      { label: 'Police are not acting on my FIR', topicKey: 'criminal-fir' },
      { label: 'Something else', topicKey: 'general' },
    ],
  },
  general: {
    question: 'Which area does this touch the most?',
    options: [
      { label: 'Family / marriage', clarifyKey: 'divorce-family' },
      {
        label: 'Property / rent',
        topicKey: 'tenant-landlord',
        practiceOverride: 'property',
      },
      { label: 'Buying land or a flat', topicKey: 'property-purchase' },
      { label: 'Land / boundary dispute', topicKey: 'encroachment' },
      { label: 'Money / cheque / loans', clarifyKey: 'money' },
      { label: 'Job / salary', topicKey: 'employment' },
      { label: 'Police / criminal', clarifyKey: 'criminal-fir' },
      { label: 'Consumer / service issue', topicKey: 'consumer' },
      { label: 'Something else', topicKey: 'general' },
      { label: 'It’s not a legal problem', notLegal: true },
    ],
  },
};

export function topicByKey(key: string): GuidanceTopic {
  return GUIDANCE_TOPICS.find((t) => t.key === key) ?? FALLBACK_TOPIC;
}
