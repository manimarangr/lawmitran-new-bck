import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import { guideCategories, allGuideCards } from '@/lib/legal-guides/source';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const metadata: Metadata = {
  title: 'All Legal Guides | LawMitran',
  description:
    'Every LawMitran legal guide in one place, organised by topic — property, family, criminal, consumer, cyber, tax, employment and more.',
  alternates: { canonical: `${SITE_URL}/legal-guides/all` },
};

export default async function AllGuidesPage() {
  const [categories, all] = await Promise.all([guideCategories(), allGuideCards()]);

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> /{' '}
          <Link href="/legal-guides" className="hover:text-gold">Legal Guides</Link> /{' '}
          <span className="text-slate-500">All Guides</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-navy md:text-3xl">All Legal Guides</h1>
        <p className="mt-1 text-sm text-slate-500">Browse every guide by topic.</p>

        {categories.map((c) => {
          const guides = all.filter((g) => g.category === c.slug);
          if (guides.length === 0) return null;
          return (
            <section key={c.slug} className="mt-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-gold">
                  <Icon name={c.icon} aria-hidden="true" className="text-sm" />
                </span>
                <Link href={`/legal-guides/category/${c.slug}`} className="text-base font-bold text-navy hover:text-gold">
                  {c.name}
                </Link>
              </div>
              <ul className="ml-10 list-disc space-y-1 text-sm">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/legal-guides/${g.slug}`} className="text-slate-600 hover:text-gold">
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Container>
  );
}
