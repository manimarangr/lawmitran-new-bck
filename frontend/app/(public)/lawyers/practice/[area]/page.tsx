import type { Metadata } from 'next';
import Link from 'next/link';
import { getLawyers } from '@/lib/api/seo';
import type { LawyerListItem } from '@/types/lawyer';
import Icon from '@/components/ui/Icon';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

// ISR — regenerate periodically as supply/ratings change.
export const revalidate = 3600;

interface Props {
  params: Promise<{ area: string }>;
}

const titleCase = (s: string) =>
  s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const CITIES = ['bengaluru', 'chennai', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 'kochi'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const areaName = titleCase(area);
  const url = `${SITE_URL}/lawyers/practice/${area}`;
  const title = `${areaName} Lawyers in India — Bar Council–Verified`;
  const description = `Find verified ${areaName.toLowerCase()} lawyers across India. Compare ratings and experience by city, submit your requirement free — the lawyer contacts you directly.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function PracticeHubPage({ params }: Props) {
  const { area } = await params;
  const areaName = titleCase(area);

  const result = await getLawyers({ practiceArea: area, limit: 10 }).catch(() => ({
    items: [] as LawyerListItem[],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  }));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Lawyers', item: `${SITE_URL}/lawyers` },
      { '@type': 'ListItem', position: 3, name: areaName, item: `${SITE_URL}/lawyers/practice/${area}` },
    ],
  };

  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <header className="hero-light py-10">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> /{' '}
            <Link href="/lawyers" className="hover:text-gold">Lawyers</Link> /{' '}
            <span>{areaName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-4xl">{areaName} Lawyers in India</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
            Bar Council–verified {areaName.toLowerCase()} advocates across India. Pick your city,
            compare experience and client ratings, and submit your requirement free — the lawyer
            contacts you directly.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* city grid */}
        <section aria-labelledby="city-heading">
          <h2 id="city-heading" className="mb-4 text-xl font-extrabold text-navy">
            {areaName} lawyers by city
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CITIES.map((c) => (
              <Link
                key={c}
                href={`/lawyers/${c}/${area}`}
                className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft text-lg text-navy transition group-hover:bg-navy group-hover:text-gold"
                >
                  <Icon name="location-dot" />
                </span>
                <span className="block text-sm font-bold text-navy">{titleCase(c)}</span>
                <span className="text-xs text-muted">{areaName}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* top lawyers nationwide */}
        <section aria-labelledby="top-heading" className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="top-heading" className="text-xl font-extrabold text-navy">
              Top {areaName.toLowerCase()} lawyers
            </h2>
            <Link href={`/lawyers?practiceArea=${area}`} className="text-sm font-bold text-navy hover:text-gold">
              See all <Icon name="arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-4">
            {result.items.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-slate-400">
                No verified {areaName.toLowerCase()} lawyers listed yet — check back soon.
              </p>
            )}
            {result.items.map((l) => (
              <article key={l.id} className="flex flex-col gap-5 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm sm:flex-row">
                <div
                  aria-hidden="true"
                  className="hero-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold text-gold"
                >
                  {l.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {l.slug ? (
                      <Link href={`/lawyer/${l.slug}`} className="hover:text-navy">{l.fullName}</Link>
                    ) : (
                      l.fullName
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {l.city?.name ?? l.barCouncilState} · {l.experienceYears} yrs
                    {l.ratingAvg ? ` · ★ ${l.ratingAvg} (${l.ratingCount})` : ''}
                  </p>
                  {l.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{l.bio}</p>}
                </div>
                {l.slug && (
                  <Link href={`/lawyer/${l.slug}`} className="self-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                    View profile
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <p className="mt-10 text-[11px] leading-relaxed text-slate-400">
          LawMitran is an information platform, not a law firm. Listings are informational and not an
          endorsement or solicitation.
        </p>
      </div>
    </main>
  );
}
