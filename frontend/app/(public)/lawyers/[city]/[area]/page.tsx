import type { Metadata } from 'next';
import Link from 'next/link';
import { getLanding, getLawyers } from '@/lib/api/seo';
import type { LawyerListItem } from '@/types/lawyer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

// ISR — regenerate periodically as supply/ratings change.
export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; area: string }>;
}

const titleCase = (s: string) =>
  s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, area } = await params;
  const landing = await getLanding(city, area);
  const url = `${SITE_URL}/lawyers/${city}/${area}`;
  return {
    title: landing.title,
    description: landing.intro.slice(0, 155),
    alternates: { canonical: url },
    openGraph: { title: landing.title, description: landing.intro.slice(0, 155), url },
  };
}

const OTHER_CITIES = ['chennai', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata'];
const OTHER_AREAS = ['criminal-law', 'property-law', 'corporate-law', 'consumer-law', 'civil-law'];

export default async function CityPracticeLanding({ params }: Props) {
  const { city, area } = await params;
  const [landing, result] = await Promise.all([
    getLanding(city, area),
    getLawyers({ city, practiceArea: area, limit: 10 }).catch(() => ({
      items: [] as LawyerListItem[],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    })),
  ]);

  const cityName = titleCase(city);
  const areaName = titleCase(area);
  const faqs = landing.faqJson ?? [];

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Lawyers', item: `${SITE_URL}/lawyers` },
      { '@type': 'ListItem', position: 3, name: cityName, item: `${SITE_URL}/lawyers/${city}` },
      { '@type': 'ListItem', position: 4, name: areaName, item: `${SITE_URL}/lawyers/${city}/${area}` },
    ],
  };
  const faqLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <header className="bg-gradient-to-br from-[#0B192C] to-[#1E3E62] py-10 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-300">
            <Link href="/" className="hover:text-amber-400">Home</Link> /{' '}
            <Link href="/lawyers" className="hover:text-amber-400">Lawyers</Link> /{' '}
            <Link href={`/lawyers/${city}`} className="hover:text-amber-400">{cityName}</Link> /{' '}
            <span>{areaName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{landing.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{landing.intro}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section aria-label={`${areaName} lawyers in ${cityName}`} className="space-y-4">
          {result.items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-slate-400">
              No verified {areaName.toLowerCase()} lawyers listed in {cityName} yet.
            </p>
          )}
          {result.items.map((l) => (
            <article key={l.id} className="flex flex-col gap-5 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm sm:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-xl font-extrabold text-[#C9A24B]">
                {l.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  {l.slug ? <Link href={`/lawyer/${l.slug}`} className="hover:text-[#0B192C]">{l.fullName}</Link> : l.fullName}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {l.city?.name ?? l.barCouncilState} · {l.experienceYears} yrs
                  {l.ratingAvg ? ` · ★ ${l.ratingAvg} (${l.ratingCount})` : ''}
                </p>
                {l.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{l.bio}</p>}
              </div>
              {l.slug && (
                <Link href={`/lawyer/${l.slug}`} className="self-center rounded-xl bg-[#0B192C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  View profile
                </Link>
              )}
            </article>
          ))}
          <Link href={`/lawyers?city=${city}&practiceArea=${area}`} className="block rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-[#0B192C] hover:border-[#C9A24B]">
            See all {areaName.toLowerCase()} lawyers in {cityName} →
          </Link>
        </section>

        {faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-extrabold text-[#0B192C]">{areaName} lawyers in {cityName} — FAQs</h2>
            <div className="space-y-2">
              {faqs.map((f) => (
                <details key={f.q} className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer font-semibold text-slate-800">{f.q}</summary>
                  <p className="mt-2 text-sm text-slate-500">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">{areaName} lawyers in other cities</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {OTHER_CITIES.map((c) => (
                <li key={c}>
                  <Link href={`/lawyers/${c}/${area}`} className="text-[#0B192C] hover:text-[#C9A24B]">
                    {areaName} lawyers in {titleCase(c)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Other practice areas in {cityName}</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {OTHER_AREAS.map((a) => (
                <li key={a}>
                  <Link href={`/lawyers/${city}/${a}`} className="text-[#0B192C] hover:text-[#C9A24B]">
                    {titleCase(a)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
