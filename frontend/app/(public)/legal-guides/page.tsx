import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import {
  guideCategories,
  allGuideCards,
  latestGuideCards,
} from '@/lib/legal-guides/source';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const metadata: Metadata = {
  title: 'Legal Guides — Indian Law Explained Simply | LawMitran',
  description:
    'Plain-English guides to Indian laws and procedures across property, family, criminal, consumer, cyber, tax and more. Learn your rights, then connect with a verified lawyer.',
  alternates: { canonical: `${SITE_URL}/legal-guides` },
};

export default async function LegalGuidesPage() {
  const [categories, all, latest] = await Promise.all([
    guideCategories(),
    allGuideCards(),
    latestGuideCards(6),
  ]);
  const counts = all.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1;
    return acc;
  }, {});

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'LawMitran Legal Guides',
    itemListElement: all.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/legal-guides/${g.slug}`,
      name: g.title,
    })),
  };

  return (
    <div>
      <section className="hero-light">
        <Container className="py-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">Legal Guides</p>
          <h1 className="text-3xl font-extrabold text-navy md:text-4xl">
            Indian law, explained in simple English
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
            Browse by topic to understand your rights and the correct process. Every guide is written
            for non-lawyers, with steps, documents, timelines, and FAQs.
          </p>
        </Container>
      </section>

      <Container className="py-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Browse by topic</h2>
          <Link href="/legal-guides/all" className="text-sm font-semibold text-gold hover:underline">
            All Guides →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const count = counts[c.slug] ?? 0;
            return (
              <Link
                key={c.slug}
                href={`/legal-guides/category/${c.slug}`}
                className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-gold">
                  <Icon name={c.icon} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-navy group-hover:text-gold">
                    {c.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {count} {count === 1 ? 'guide' : 'guides'}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-4 mt-12 text-lg font-bold text-navy">Latest guides</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {latest.map((g) => (
            <Link
              key={g.slug}
              href={`/legal-guides/${g.slug}`}
              className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="text-base font-bold text-navy group-hover:text-gold">{g.title}</h3>
              <p className="mt-1.5 line-clamp-3 text-sm text-slate-500">{g.metaDescription}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold">
                Read guide <Icon name="chevron-right" aria-hidden="true" className="text-xs" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-12 rounded-2xl bg-navy px-6 py-8 text-center text-white">
          <h2 className="text-xl font-extrabold">Have a legal issue of your own?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-200">
            Submit your requirement on LawMitran and connect with a verified lawyer who can advise on
            your specific situation.
          </p>
          <Link
            href="/lawyers"
            className="mt-5 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy hover:opacity-90"
          >
            Connect with a verified lawyer
          </Link>
        </section>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </div>
  );
}
