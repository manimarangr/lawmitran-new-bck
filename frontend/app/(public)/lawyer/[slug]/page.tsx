import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLawyerBySlug } from '@/lib/api/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);
  if (!lawyer) return { title: 'Lawyer not found' };

  const areas = lawyer.practiceAreas.map((p) => p.practiceArea.name).join(', ');
  const city = lawyer.city?.name ?? lawyer.barCouncilState;
  const title = `${lawyer.fullName} — ${areas || 'Advocate'} in ${city}`;
  const description = `${lawyer.fullName} is a Bar Council–verified advocate${
    lawyer.experienceYears ? ` with ${lawyer.experienceYears} years' experience` : ''
  } in ${city}${areas ? `, practising ${areas}` : ''}. View profile and submit your requirement on LawMitran.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/lawyer/${slug}` },
    openGraph: { title, description, url: `${SITE_URL}/lawyer/${slug}` },
  };
}

export default async function LawyerProfilePage({ params }: Props) {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);
  if (!lawyer) notFound();

  const areas = lawyer.practiceAreas.map((p) => p.practiceArea.name);
  const city = lawyer.city?.name ?? lawyer.barCouncilState;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Attorney',
    name: lawyer.fullName,
    areaServed: city,
    knowsAbout: areas,
    url: `${SITE_URL}/lawyer/${slug}`,
    ...(lawyer.ratingAvg && lawyer.ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: lawyer.ratingAvg,
            reviewCount: lawyer.ratingCount,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-600">Home</Link> /{' '}
        <Link href="/lawyers" className="hover:text-amber-600">Lawyers</Link> /{' '}
        <span className="text-slate-700">{lawyer.fullName}</span>
      </nav>

      <header className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#0B192C] text-3xl font-extrabold text-[#C9A24B]">
            {lawyer.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B192C]">{lawyer.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {city} · {lawyer.experienceYears} yrs
              {lawyer.ratingAvg ? ` · ★ ${lawyer.ratingAvg} (${lawyer.ratingCount})` : ''}
            </p>
            {areas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {areas.map((a) => (
                  <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {lawyer.bio && <p className="mt-6 text-sm leading-relaxed text-slate-600">{lawyer.bio}</p>}
        <Link
          href={`/lawyers?lawyer=${lawyer.id}`}
          className="mt-6 inline-block rounded-xl bg-[#0B192C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Contact Lawyer
        </Link>
      </header>

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
        LawMitran is an information platform, not a law firm. Listings are informational and not an
        endorsement or solicitation.
      </p>
    </main>
  );
}
