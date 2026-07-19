import Link from 'next/link';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import Icon from '@/components/ui/Icon';
import AskLegalBox from '@/components/home/AskLegalBox';
import HomeLawyers from '@/components/home/HomeLawyers';
import { fetchDocTemplates, type DocTemplateListItem } from '@/lib/api/documents';
import { getPracticeAreas, type PracticeAreaRef } from '@/lib/api/seo';

// ISR — refresh featured lawyers/areas periodically.
export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

/** Fallback reference data when the API is unreachable (e.g. cold local dev). */
const FALLBACK_AREAS: PracticeAreaRef[] = [
  { id: 'family-law', name: 'Family Law', slug: 'family-law' },
  { id: 'criminal-law', name: 'Criminal Law', slug: 'criminal-law' },
  { id: 'property-law', name: 'Property Law', slug: 'property-law' },
  { id: 'civil-law', name: 'Civil Law', slug: 'civil-law' },
  { id: 'corporate-law', name: 'Corporate Law', slug: 'corporate-law' },
  { id: 'consumer-law', name: 'Consumer Law', slug: 'consumer-law' },
  { id: 'employment-law', name: 'Employment Law', slug: 'employment-law' },
  { id: 'tax-law', name: 'Tax Law', slug: 'tax-law' },
];

const AREA_ICONS: Record<string, string> = {
  'family-law': 'users',
  'criminal-law': 'shield-halved',
  'property-law': 'file-shield',
  'civil-law': 'scale-balanced',
  'corporate-law': 'briefcase',
  'consumer-law': 'gavel',
  'employment-law': 'id-badge',
  'tax-law': 'file-invoice',
  'intellectual-property': 'bookmark',
  immigration: 'paper-plane',
  'banking-finance': 'tags',
  'cyber-law': 'bolt',
};

// Short, uniform subtitles — 2–4 words so tile heights always align.
const AREA_SUBS: Record<string, string> = {
  'family-law': 'Divorce, Child Custody',
  'criminal-law': 'FIR, Bail, Appeals',
  'property-law': 'Property Disputes',
  'civil-law': 'Suits & Recovery',
  'corporate-law': 'Company, Contracts',
  'consumer-law': 'Consumer Complaints',
  'employment-law': 'Job, Salary, Termination',
  'tax-law': 'Income Tax, GST',
};

const DOCS = [
  { icon: 'file-invoice', title: 'Rental Agreement' },
  { icon: 'file-shield', title: 'Affidavit' },
  { icon: 'id-badge', title: 'Power of Attorney' },
  { icon: 'folder-open', title: 'Sale Deed' },
  { icon: 'briefcase', title: 'Employment Contract' },
  { icon: 'scale-balanced', title: 'Legal Notice' },
];

const STEPS = [
  { title: 'Tell us your issue', desc: "Choose a category and your city, or describe your situation in a few words. It's free and confidential." },
  { title: 'Get matched', desc: 'We route your requirement to verified, eligible lawyers who handle your type of case in your area.' },
  { title: 'The lawyer contacts you', desc: 'Matched lawyers reach out directly. You compare, choose, and proceed — no obligation.' },
];

export default async function HomePage() {
  // Real data from the API; graceful fallbacks keep the page rendering if it's down.
  const [templatesResult, areasResult] = await Promise.allSettled([
    fetchDocTemplates(),
    getPracticeAreas(),
  ]);
  const templates: DocTemplateListItem[] =
    templatesResult.status === 'fulfilled' ? templatesResult.value.slice(0, 4) : [];
  const areas: PracticeAreaRef[] =
    areasResult.status === 'fulfilled' && areasResult.value.length > 0
      ? areasResult.value
      : FALLBACK_AREAS;
  const withSubs = areas.filter((a) => AREA_SUBS[a.slug]);
  const gridAreas = (withSubs.length >= 6 ? withSubs : areas).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* ===== Hero (light — sample-ui/index-current-lighthero.html) ===== */}
        <section
          id="find"
          className="relative overflow-hidden px-5 pb-10 pt-12 text-center"
          style={{ background: 'linear-gradient(180deg,#eef3fa,#ffffff 96%)' }}
        >
          <Icon
            name="scale-balanced"
            aria-hidden="true"
            className="pointer-events-none absolute right-[4%] top-1/2 hidden -translate-y-1/2 text-[22rem] text-navy/5 lg:block"
          />
          <div className="relative z-10 mx-auto max-w-[62.5rem]">
            <span className="inline-block rounded-full border border-gold bg-white px-4.5 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-navy">
              Verified Legal Marketplace
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.06] tracking-[-1.5px] text-navy sm:text-5xl lg:text-[3.5rem]">
              What&apos;s your <span className="text-gold">legal question?</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[38.75rem] text-lg text-slate-500">
              Ask in plain words. Get instant guidance — then connect with a verified lawyer.
            </p>
            <div className="mb-6" />

            {/* hero: legal-question box (docs/12 P0) — search demoted to the link below */}
            <AskLegalBox />
            <p className="mt-4 text-[0.8125rem] text-slate-500">
              Know what you need?{' '}
              <Link href="/lawyers" className="text-gold underline">
                Search lawyers by city &amp; practice area
              </Link>
            </p>
          </div>
        </section>

        {/* ===== Practice areas (from reference API) ===== */}
        <section id="practice" className="px-5 pb-8 pt-8">
          <div className="mx-auto max-w-[73.75rem]">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-navy">Popular practice areas</h2>
                <span aria-hidden="true" className="mt-2 block h-1 w-12 rounded bg-gold" />
              </div>
              <Link href="/lawyers" className="text-sm font-bold text-navy hover:text-gold">
                View all <Icon name="arrow-right" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {gridAreas.map((a) => (
                <Link
                  key={a.id}
                  href={`/lawyers/practice/${a.slug}`}
                  className="group rounded-2xl border border-line bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-gold hover:shadow-lg"
                >
                  <span aria-hidden="true" className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-navy transition group-hover:bg-navy group-hover:text-gold">
                    <Icon name={AREA_ICONS[a.slug] ?? 'gavel'} />
                  </span>
                  <b className="block text-sm text-navy">{a.name}</b>
                  <p className="mt-1 text-xs text-muted">
                    {AREA_SUBS[a.slug] ?? 'Verified advocates'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Verified lawyers (neutral showcase — client, city-aware) ===== */}
        <HomeLawyers />

        {/* ===== Documents ===== */}
        <section id="documents" className="px-5 pb-10 pt-8">
          <div className="mx-auto max-w-[73.75rem] text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy">Get legal documents, delivered online</h2>
            <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-12 rounded bg-gold" />
            <p className="mx-auto mt-2 max-w-[38.75rem] text-muted">
              Pick a document, fill a guided form, add stamp paper if needed, and download — or get the stamped copy couriered.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 text-left sm:grid-cols-3 lg:grid-cols-6">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  href={`/legal-documents/${t.slug}`}
                  className="block rounded-xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-gold hover:shadow-md"
                >
                  <span aria-hidden="true" className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-bg-soft text-lg text-navy">
                    <Icon name="file-invoice" />
                  </span>
                  <b className="block text-sm leading-snug text-navy">{t.title}</b>
                  <small className="text-xs text-muted">₹{Number(t.price).toLocaleString('en-IN')}</small>
                </Link>
              ))}
              {/* Pad the row to 6 with upcoming documents so it always looks complete. */}
              {DOCS.filter((d) => !templates.some((t) => t.title.toLowerCase().includes(d.title.toLowerCase())))
                .slice(0, Math.max(0, 6 - templates.length))
                .map((d) => (
                  <Link
                    key={d.title}
                    href="/legal-documents"
                    className="block rounded-xl border border-dashed border-gray-200 bg-white/60 p-4 shadow-sm transition hover:-translate-y-1 hover:border-gold"
                  >
                    <span aria-hidden="true" className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-bg-soft text-lg text-slate-400">
                      <Icon name={d.icon} />
                    </span>
                    <b className="block text-sm leading-snug text-navy">{d.title}</b>
                    <small className="text-xs text-slate-400">Coming soon</small>
                  </Link>
                ))}
            </div>
            <div className="mt-7">
              <Link
                href="/legal-documents"
                className="inline-flex rounded-[10px] bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-navy transition hover:-translate-y-px hover:bg-[#b88a10]"
              >
                Browse all documents
              </Link>
            </div>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section id="how" className="bg-bg-soft px-5 pb-10 pt-8">
          <div className="mx-auto max-w-[73.75rem]">
            <h2 className="text-center text-3xl font-bold tracking-tight text-navy">How LawMitran works</h2>
            <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-12 rounded bg-gold" />
            <p className="mx-auto mt-2 max-w-[38.75rem] text-center text-muted">
              Three simple steps from problem to the right lawyer.
            </p>
            {/* Horizontal connected timeline (dashed connector behind the numbers). */}
            <ol className="relative mt-10 grid gap-8 md:grid-cols-3">
              <span
                aria-hidden="true"
                className="absolute left-[16.66%] right-[16.66%] top-6 hidden border-t-2 border-dashed border-gray-300 md:block"
              />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative z-10 text-center">
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-bg-soft bg-navy text-lg font-extrabold text-gold shadow-sm"
                  >
                    {i + 1}
                  </span>
                  <b className="text-navy">{s.title}</b>
                  <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-muted">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'LawMitran',
          url: SITE_URL,
          logo: `${SITE_URL}/logo.svg`,
          description:
            'Information platform for discovering Bar Council-verified advocates and legal documents in India.',
          email: 'support@lawmitran.com',
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'LawMitran',
          url: SITE_URL,
        }) }}
      />
    </div>
  );
}
