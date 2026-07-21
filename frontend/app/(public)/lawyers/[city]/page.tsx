import type { Metadata } from 'next';
import Link from 'next/link';
import { getLawyers } from '@/lib/api/seo';
import type { LawyerListItem } from '@/types/lawyer';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import { LocalityMapPreview, type LocalityMapMarker } from '@/components/lawyers/LocalityMapPreview';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

// ISR — regenerate periodically as supply/ratings change.
export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string }>;
}

const titleCase = (s: string) =>
  s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const PRACTICE_AREAS = [
  { slug: 'family-law', name: 'Family Law', icon: 'users' },
  { slug: 'criminal-law', name: 'Criminal Law', icon: 'shield-halved' },
  { slug: 'property-law', name: 'Property Law', icon: 'file-shield' },
  { slug: 'civil-law', name: 'Civil Law', icon: 'scale-balanced' },
  { slug: 'corporate-law', name: 'Corporate Law', icon: 'briefcase' },
  { slug: 'consumer-law', name: 'Consumer Law', icon: 'gavel' },
  { slug: 'employment-law', name: 'Employment Law', icon: 'id-badge' },
  { slug: 'tax-law', name: 'Tax Law', icon: 'file-invoice' },
];

const OTHER_CITIES = ['bengaluru', 'chennai', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 'kochi'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityName = titleCase(city);
  const url = `${SITE_URL}/lawyers/${city}`;
  const title = `Lawyers in ${cityName} — Bar Council–Verified Advocates`;
  const description = `Find verified lawyers in ${cityName} across family, criminal, property, corporate, and more. Compare ratings and experience, submit your requirement free — the lawyer contacts you directly.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function CityHubPage({ params }: Props) {
  const { city } = await params;
  const cityName = titleCase(city);

  const result = await getLawyers({ city, limit: 10 }).catch(() => ({
    items: [] as LawyerListItem[],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  }));

  const mapMarkers: LocalityMapMarker[] = result.items
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      lat: l.latitude as number,
      lng: l.longitude as number,
      label: l.fullName,
      sublabel: l.practiceAreas[0]?.practiceArea.name,
      href: `/lawyer/${l.slug ?? l.id}`,
    }));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Lawyers', item: `${SITE_URL}/lawyers` },
      { '@type': 'ListItem', position: 3, name: cityName, item: `${SITE_URL}/lawyers/${city}` },
    ],
  };

  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* hero */}
      <header className="hero-light py-10">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> /{' '}
            <Link href="/lawyers" className="hover:text-gold">Lawyers</Link> /{' '}
            <span>{cityName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-4xl">Lawyers in {cityName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
            Find Bar Council–verified advocates in {cityName} across every practice area. Compare
            experience and client ratings, then submit your requirement free — the lawyer contacts
            you directly.
          </p>
          {result.total > 0 && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-1.5 text-xs font-bold text-gold">
              <Icon name="circle-check" aria-hidden="true" /> {result.total} verified lawyer{result.total !== 1 ? 's' : ''} in {cityName}
            </p>
          )}
        </Container>
      </header>

      <Container className="py-10">
        {/* practice area grid */}
        <section aria-labelledby="areas-heading">
          <h2 id="areas-heading" className="mb-4 text-xl font-extrabold text-navy">
            Browse by practice area
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PRACTICE_AREAS.map((a) => (
              <Link
                key={a.slug}
                href={`/lawyers/${city}/${a.slug}`}
                className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-soft text-lg text-navy transition group-hover:bg-navy group-hover:text-gold"
                >
                  <Icon name={a.icon} />
                </span>
                <span className="block text-sm font-bold text-navy">{a.name}</span>
                <span className="text-xs text-muted">in {cityName}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* top lawyers */}
        <section aria-labelledby="top-heading" className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="top-heading" className="text-xl font-extrabold text-navy">
              Top verified lawyers in {cityName}
            </h2>
            <Link href={`/lawyers?city=${city}`} className="text-sm font-bold text-navy hover:text-gold">
              See all <Icon name="arrow-right" aria-hidden="true" />
            </Link>
          </div>

          {mapMarkers.length > 0 && (
            <div className="mb-6">
              <LocalityMapPreview markers={mapMarkers} />
            </div>
          )}

          <div className="space-y-4">
            {result.items.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-slate-400">
                No verified lawyers listed in {cityName} yet — check back soon.
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
                  {l.practiceAreas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {l.practiceAreas.slice(0, 3).map((p) => (
                        <span key={p.practiceArea.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {p.practiceArea.name}
                        </span>
                      ))}
                    </div>
                  )}
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

        {/* other cities */}
        <section aria-labelledby="cities-heading" className="mt-12">
          <h2 id="cities-heading" className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Lawyers in other cities
          </h2>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {OTHER_CITIES.filter((c) => c !== city).map((c) => (
              <li key={c}>
                <Link href={`/lawyers/${c}`} className="text-navy hover:text-gold">
                  Lawyers in {titleCase(c)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-[11px] leading-relaxed text-slate-400">
          LawMitran is an information platform, not a law firm. Listings are informational and not an
          endorsement or solicitation.
        </p>
      </Container>
    </main>
  );
}
