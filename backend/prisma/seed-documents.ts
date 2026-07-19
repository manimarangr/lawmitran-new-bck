/**
 * Phase 1 seed: document-marketplace categories and starter templates.
 * Idempotent - upserts by slug, safe to re-run.
 *
 *   npm run seed:documents --workspace backend
 */
import { Prisma, PrismaClient, TemplateStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'toggle' | 'checkbox' | 'state';
  stampValue?: boolean;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  section?: string;
}

interface SeedTemplate {
  slug: string;
  categorySlug: string;
  title: string;
  price: number;
  keywords: string[];
  requiresStamp: boolean;
  stampBasis?: string;
  fields: Field[];
  body: string;
}

const CATEGORIES = [
  { slug: 'personal', name: 'Personal & Family', description: 'Everyday personal and family legal documents.' },
  { slug: 'business', name: 'Business & Startup', description: 'Contracts and agreements for businesses and founders.' },
  { slug: 'notices', name: 'Legal Notices', description: 'Formal legal notices and demands.' },
];

const TEMPLATES: SeedTemplate[] = [
  {
    slug: 'residential-rental-agreement',
    categorySlug: 'personal',
    title: 'Residential Rental Agreement',
    price: 199,
    keywords: ['rental agreement', 'lease', 'rent agreement', 'tenancy', 'house rent'],
    requiresStamp: true,
    stampBasis: 'rental-agreement',
    fields: [
      { name: 'purpose', label: 'Purpose of renting', type: 'toggle', options: ['Residential', 'Commercial'], section: 'Agreement' },
      { name: 'propertyType', label: 'Type of property', type: 'toggle', options: ['House', 'Apartment', 'Room'], section: 'Agreement' },
      { name: 'agreementDate', label: 'Agreement date', type: 'date', section: 'Agreement' },
      { name: 'city', label: 'City', type: 'text', section: 'Agreement', placeholder: 'Bengaluru' },
      { name: 'state', label: 'State', type: 'state', section: 'Agreement', help: 'Used for stamp duty and the governing tenancy law' },
      { name: 'landlordName', label: 'Landlord full name', type: 'text', section: 'Landlord' },
      { name: 'landlordAddress', label: 'Landlord address', type: 'textarea', section: 'Landlord' },
      { name: 'tenantName', label: 'Tenant full name', type: 'text', section: 'Tenant' },
      { name: 'tenantAddress', label: 'Tenant permanent address', type: 'textarea', section: 'Tenant' },
      { name: 'propertyAddress', label: 'Rented property address', type: 'textarea', section: 'Property' },
      { name: 'furnishing', label: 'Furnishing', type: 'toggle', options: ['Unfurnished', 'Semi-furnished', 'Fully furnished'], section: 'Property' },
      { name: 'monthlyRent', label: 'Monthly rent (INR)', type: 'number', section: 'Rent & Terms', stampValue: true },
      { name: 'securityDeposit', label: 'Security deposit (INR)', type: 'number', section: 'Rent & Terms' },
      { name: 'maintenanceIncluded', label: 'Maintenance included in rent', type: 'checkbox', section: 'Rent & Terms', placeholder: 'Maintenance charges are included in the rent', required: false },
      { name: 'termMonths', label: 'Term (months)', type: 'number', section: 'Rent & Terms', placeholder: '11' },
      { name: 'startDate', label: 'Tenancy start date', type: 'date', section: 'Rent & Terms' },
      { name: 'noticePeriodDays', label: 'Notice period (days)', type: 'number', section: 'Rent & Terms', placeholder: '30' },
      { name: 'lockInMonths', label: 'Lock-in period (months)', type: 'number', section: 'Rent & Terms', required: false, help: 'Leave empty for no lock-in' },
      { name: 'petsAllowed', label: 'Pets allowed', type: 'checkbox', section: 'Additional Clauses', placeholder: 'Tenant may keep domesticated pets', required: false },
      { name: 'parkingIncluded', label: 'Parking included', type: 'checkbox', section: 'Additional Clauses', placeholder: 'One parking space is included', required: false },
      { name: 'sublettingAllowed', label: 'Subletting allowed', type: 'checkbox', section: 'Additional Clauses', placeholder: 'Tenant may sublet with written consent', required: false },
      { name: 'smokingAllowed', label: 'Smoking allowed', type: 'checkbox', section: 'Additional Clauses', placeholder: 'Smoking is permitted inside the premises', required: false },
    ],
    body: `{{#eq purpose "Commercial"}}COMMERCIAL RENTAL AGREEMENT{{else}}RESIDENTIAL RENTAL AGREEMENT{{/eq}}

This Rental Agreement is made on {{agreementDate}} at {{city}}, {{state}}.

BETWEEN
{{landlordName}}, residing at {{landlordAddress}} (hereinafter the "Landlord");

AND
{{tenantName}}, residing at {{tenantAddress}} (hereinafter the "Tenant").

1. PREMISES. The Landlord lets to the Tenant the {{#eq propertyType "Room"}}room{{else}}{{#eq propertyType "Apartment"}}apartment{{else}}independent house{{/eq}}{{/eq}} situated at
{{propertyAddress}} ({{furnishing}}) (the "Premises"), to be used for {{#eq purpose "Commercial"}}commercial{{else}}residential{{/eq}} purposes only.

2. TERM. The tenancy is for a period of {{termMonths}} months commencing on
{{startDate}}.{{#if lockInMonths}} Neither party may terminate during the first {{lockInMonths}} months (the "Lock-in Period"), except for breach.{{/if}}

3. RENT. The Tenant shall pay a monthly rent of Rs. {{monthlyRent}}, payable in
advance on or before the 5th day of each calendar month.{{#if maintenanceIncluded}} Maintenance charges are included in the said rent.{{else}} Maintenance charges are payable by the Tenant in addition to the rent.{{/if}}

4. SECURITY DEPOSIT. The Tenant has paid an interest-free refundable security
deposit of Rs. {{securityDeposit}}, refundable at the end of the tenancy after
deducting lawful dues.

5. NOTICE. Either party may terminate this Agreement by giving {{noticePeriodDays}}
days' written notice to the other.

6. USE. The Premises shall be used for {{#eq purpose "Commercial"}}lawful commercial{{else}}residential{{/eq}} purposes only{{#if sublettingAllowed}}. The Tenant may sublet the Premises only with the Landlord's prior written consent{{else}} and shall not be sublet{{/if}}.

7. MAINTENANCE. The Tenant shall keep the Premises in good condition, normal wear
and tear excepted, and shall pay for electricity, water, and other utilities
consumed.
{{#if petsAllowed}}
8. PETS. The Tenant shall be permitted to keep domesticated pets in the Premises,
provided they cause no nuisance or damage.
{{/if}}{{#if parkingIncluded}}
9. PARKING. One designated parking space is provided to the Tenant as part of this
tenancy at no additional cost.
{{/if}}{{#if smokingAllowed}}
10. SMOKING. Smoking is permitted within the Premises.
{{else}}
10. SMOKING. Smoking is not permitted within the Premises.
{{/if}}
11. GOVERNING LAW. This Agreement is governed by {{#eq state "Karnataka"}}the Karnataka Rent Act, 1999 and{{/eq}}{{#eq state "Maharashtra"}}the Maharashtra Rent Control Act, 1999 and{{/eq}}{{#eq state "Tamil Nadu"}}the Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017 and{{/eq}}{{#eq state "Delhi"}}the Delhi Rent Control Act, 1958 and{{/eq}} the laws of India, and subject to the jurisdiction of the courts at {{city}}.

IN WITNESS WHEREOF the parties have signed this Agreement on the date first above
written.

LANDLORD                              TENANT
{{landlordName}}                      {{tenantName}}

WITNESS 1: __________________         WITNESS 2: __________________`,
  },
  {
    slug: 'non-disclosure-agreement',
    categorySlug: 'business',
    title: 'Non-Disclosure Agreement (Mutual)',
    price: 149,
    keywords: ['nda', 'non disclosure', 'confidentiality agreement', 'mutual nda'],
    requiresStamp: false,
    fields: [
      { name: 'effectiveDate', label: 'Effective date', type: 'date', section: 'Basics' },
      { name: 'partyOne', label: 'First party (name)', type: 'text', section: 'Parties' },
      { name: 'partyOneAddress', label: 'First party address', type: 'textarea', section: 'Parties' },
      { name: 'partyTwo', label: 'Second party (name)', type: 'text', section: 'Parties' },
      { name: 'partyTwoAddress', label: 'Second party address', type: 'textarea', section: 'Parties' },
      { name: 'purpose', label: 'Purpose of disclosure', type: 'textarea', section: 'Terms', placeholder: 'Evaluating a potential business relationship' },
      { name: 'termYears', label: 'Confidentiality term (years)', type: 'number', section: 'Terms', placeholder: '3' },
      { name: 'jurisdiction', label: 'Governing city/jurisdiction', type: 'text', section: 'Terms', placeholder: 'Bengaluru' },
    ],
    body: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement is entered into on {{effectiveDate}}

BETWEEN {{partyOne}}, {{partyOneAddress}}, AND {{partyTwo}}, {{partyTwoAddress}}
(each a "Party" and together the "Parties").

1. PURPOSE. The Parties wish to exchange confidential information for the purpose
of {{purpose}} (the "Purpose").

2. CONFIDENTIAL INFORMATION means any non-public information disclosed by one Party
to the other, whether oral, written, or electronic, that is designated as
confidential or would reasonably be understood to be confidential.

3. OBLIGATIONS. Each Party shall (a) use the Confidential Information solely for
the Purpose, (b) not disclose it to any third party without prior written consent,
and (c) protect it with at least the same care it uses for its own confidential
information.

4. EXCLUSIONS. Obligations do not apply to information that is public, already
known, independently developed, or lawfully received from a third party.

5. TERM. The obligations of confidentiality survive for {{termYears}} years from
the date of disclosure.

6. GOVERNING LAW. This Agreement is governed by the laws of India and subject to
the exclusive jurisdiction of the courts at {{jurisdiction}}.

SIGNED for and on behalf of the Parties:

{{partyOne}}                          {{partyTwo}}`,
  },
  {
    slug: 'cheque-bounce-notice-138',
    categorySlug: 'notices',
    title: 'Cheque Bounce Legal Notice (Section 138)',
    price: 299,
    keywords: ['cheque bounce', 'section 138', 'ni act', 'dishonour of cheque', 'legal notice'],
    requiresStamp: false,
    fields: [
      { name: 'noticeDate', label: 'Notice date', type: 'date', section: 'Basics' },
      { name: 'senderName', label: 'Your name (payee)', type: 'text', section: 'Payee' },
      { name: 'senderAddress', label: 'Your address', type: 'textarea', section: 'Payee' },
      { name: 'drawerName', label: 'Drawer name (who gave the cheque)', type: 'text', section: 'Drawer' },
      { name: 'drawerAddress', label: 'Drawer address', type: 'textarea', section: 'Drawer' },
      { name: 'chequeNumber', label: 'Cheque number', type: 'text', section: 'Cheque' },
      { name: 'chequeAmount', label: 'Cheque amount (INR)', type: 'number', section: 'Cheque' },
      { name: 'bankName', label: 'Drawee bank name', type: 'text', section: 'Cheque' },
      { name: 'chequeDate', label: 'Cheque date', type: 'date', section: 'Cheque' },
      { name: 'returnDate', label: 'Cheque return/memo date', type: 'date', section: 'Cheque' },
      { name: 'returnReason', label: 'Reason for return', type: 'text', section: 'Cheque', placeholder: 'Funds insufficient' },
    ],
    body: `LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

Date: {{noticeDate}}

From: {{senderName}}, {{senderAddress}}
To:   {{drawerName}}, {{drawerAddress}}

Sir/Madam,

Under instructions from and on behalf of my client {{senderName}}, I serve upon
you the following notice:

1. That you issued cheque no. {{chequeNumber}} dated {{chequeDate}} for
Rs. {{chequeAmount}} drawn on {{bankName}} in favour of my client towards
discharge of a legally enforceable debt/liability.

2. That the said cheque, on presentation, was returned unpaid vide return memo
dated {{returnDate}} with the remark "{{returnReason}}".

3. That the dishonour of the cheque constitutes an offence under Section 138 of
the Negotiable Instruments Act, 1881.

4. You are hereby called upon to pay the sum of Rs. {{chequeAmount}} to my client
within FIFTEEN (15) DAYS of receipt of this notice, failing which my client shall
be constrained to initiate criminal proceedings under Section 138 read with
Section 142 of the said Act, entirely at your risk, cost, and consequences.

Yours faithfully,

Advocate for {{senderName}}`,
  },
];

async function main() {
  // Demo-seed templates ("[DEMO TEMPLATE] ..." bodies) are placeholders for UI
  // exploration — archive them so real templates are the only ones on sale.
  const demo = await prisma.documentTemplate.updateMany({
    where: { bodyTemplate: { contains: '[DEMO TEMPLATE]' } },
    data: { status: TemplateStatus.ARCHIVED, active: false },
  });
  if (demo.count > 0) console.log(`archived ${demo.count} demo template(s)`);

  const catId: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.documentCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { name: c.name, slug: c.slug, description: c.description },
    });
    catId[c.slug] = row.id;
    console.log(`category: ${c.slug}`);
  }

  for (const t of TEMPLATES) {
    const data = {
      categoryId: catId[t.categorySlug],
      title: t.title,
      keywords: t.keywords,
      price: t.price,
      requiresStamp: t.requiresStamp,
      stampBasis: t.stampBasis ?? null,
      schemaJson: { fields: t.fields } as unknown as Prisma.InputJsonValue,
      bodyTemplate: t.body,
      status: TemplateStatus.PUBLISHED,
      language: 'en',
      active: true,
    };
    await prisma.documentTemplate.upsert({
      where: { slug: t.slug },
      update: data,
      create: { slug: t.slug, ...data },
    });
    console.log(`template: ${t.slug} (Rs. ${t.price})`);
  }
  console.log('Document marketplace seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
