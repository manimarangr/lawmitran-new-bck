import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/site/SiteFooter';
import Icon from '@/components/ui/Icon';
import {
  getDocumentCategories,
  getDocumentTemplates,
  type DocumentCategory,
  type DocumentTemplateItem,
} from '@/lib/api/documents';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Legal Documents — Ready-to-Use Templates Online',
  description:
    'Affidavits, rental agreements, name change paperwork, NDAs and more. Pick a template, fill a guided form, and download — stamp paper handled where needed.',
  alternates: { canonical: `${SITE_URL}/legal-documents` },
};

const CATEGORY_ICONS: Record<string, string> = {
  affidavits: 'file-shield',
  'rental-agreements': 'file-invoice',
  'name-change': 'id-badge',
  'contracts-agreements': 'folder-open',
};

const inr = (n: string | number) => '₹' + Number(n).toLocaleString('en-IN');

export default async function LegalDocumentsPage() {
  const [catsResult, templatesResult] = await Promise.allSettled([
    getDocumentCategories(),
    getDocumentTemplates(),
  ]);
  const categories: DocumentCategory[] =
    catsResult.status === 'fulfilled' ? catsResult.value : [];
  const templates: DocumentTemplateItem[] =
    templatesResult.status === 'fulfilled' ? templatesResult.value : [];

  const byCategory = (slug: string) => templates.filter((t) => t.category.slug === slug);

  return (
    <main id="main">
      {/* hero */}
      <header className="hero-light py-12">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span> Legal Documents
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-4xl">
            Legal documents, delivered online
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Pick a document, fill a guided form, add stamp paper if needed, and download — or get
            the stamped copy couriered. Drafted to standard formats.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-400">
            The document library is being stocked — check back soon.
          </p>
        ) : (
          categories.map((cat) => {
            const catTemplates = byCategory(cat.slug);
            if (catTemplates.length === 0) return null;
            return (
              <section key={cat.id} aria-labelledby={`cat-${cat.slug}`} className="mb-12">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-lg text-gold"
                  >
                    <Icon name={CATEGORY_ICONS[cat.slug] ?? 'folder-open'} />
                  </span>
                  <div>
                    <h2 id={`cat-${cat.slug}`} className="text-xl font-extrabold text-navy">
                      {cat.name}
                    </h2>
                    {cat.description && <p className="text-sm text-slate-500">{cat.description}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catTemplates.map((t) => (
                    <article
                      key={t.id}
                      className="flex flex-col justify-between rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm transition hover:border-gold hover:shadow-md"
                    >
                      <div>
                        <h3 className="font-bold text-navy">{t.title}</h3>
                        {t.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {t.keywords.slice(0, 3).map((k) => (
                              <span key={k} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                        {t.requiresStamp && (
                          <p className="mt-2 text-[11px] font-semibold text-amber-600">
                            <Icon name="file-shield" aria-hidden="true" className="mr-1" />
                            Stamp paper required{t.stampBasis ? ` — ${t.stampBasis.toLowerCase()}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-lg font-extrabold text-navy">{inr(t.price)}</span>
                        <Link
                          href={`/legal-documents/${t.slug}`}
                          className="rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          Start <Icon name="chevron-right" aria-hidden="true" className="ml-0.5 text-[9px]" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {/* need a lawyer instead */}
        <section aria-label="Need more than a template" className="hero-gradient rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold">Matter too complex for a template?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Talk to a Bar Council–verified lawyer instead — submit your requirement free and they
            contact you directly.
          </p>
          <Link
            href="/lawyers"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-bold text-navy transition hover:bg-[#b58f3f]"
          >
            <Icon name="magnifying-glass" aria-hidden="true" /> Find a lawyer
          </Link>
        </section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-400">
          Templates follow standard formats; validity depends on correct execution (stamp duty,
          notarisation, signatures) which varies by state. LawMitran is not a law firm and does not
          provide legal advice.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
