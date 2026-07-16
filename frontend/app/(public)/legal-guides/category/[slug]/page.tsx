import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/site/SiteFooter';
import Icon from '@/components/ui/Icon';
import { CATEGORIES, categorySlugs, getCategory } from '@/lib/legal-guides/categories';
import { guidesByCategory } from '@/lib/legal-guides/guides';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export function generateStaticParams() {
  return categorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) return {};
  const url = `${SITE_URL}/legal-guides/category/${c.slug}`;
  const empty = guidesByCategory(c.slug).length === 0;
  return {
    title: `${c.name} — Legal Guides | LawMitran`,
    description: c.description,
    alternates: { canonical: url },
    // Thin/empty category pages are noindexed until they have content.
    robots: empty ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  const guides = guidesByCategory(c.slug);
  const url = `${SITE_URL}/legal-guides/category/${c.slug}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Legal Guides', item: `${SITE_URL}/legal-guides` },
      { '@type': 'ListItem', position: 3, name: c.name, item: url },
    ],
  };
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${c.name} — Legal Guides`,
    description: c.description,
    url,
    hasPart: guides.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      url: `${SITE_URL}/legal-guides/${g.slug}`,
    })),
  };

  return (
    <div>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> /{' '}
          <Link href="/legal-guides" className="hover:text-gold">Legal Guides</Link> /{' '}
          <span className="text-slate-500">{c.name}</span>
        </nav>

        <div className="mb-8 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-gold">
            <Icon name={c.icon} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-navy md:text-3xl">{c.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{c.description}</p>
          </div>
        </div>

        {guides.length === 0 ? (
          <p className="rounded-2xl border border-line bg-bg-soft px-4 py-8 text-center text-sm text-slate-500">
            Guides for this topic are coming soon.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <Link
                key={g.slug}
                href={`/legal-guides/${g.slug}`}
                className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-md"
              >
                <h2 className="text-base font-bold text-navy group-hover:text-gold">{g.title}</h2>
                <p className="mt-1.5 line-clamp-3 text-sm text-slate-500">{g.metaDescription}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold">
                  Read guide <Icon name="chevron-right" aria-hidden="true" className="text-xs" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-2">
          {CATEGORIES.filter((x) => x.slug !== c.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/legal-guides/category/${x.slug}`}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-gold hover:text-gold"
            >
              {x.name}
            </Link>
          ))}
        </div>

        <section className="mt-10 rounded-2xl bg-navy px-6 py-7 text-center text-white">
          <p className="text-base font-bold">Need help with a {c.name.toLowerCase()} matter?</p>
          <Link
            href="/lawyers"
            className="mt-4 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy hover:opacity-90"
          >
            Connect with a verified lawyer
          </Link>
        </section>
      </div>

      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />
    </div>
  );
}
