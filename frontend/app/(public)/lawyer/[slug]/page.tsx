import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLawyerBySlug } from '@/lib/api/seo';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import { LocalityMapPreview, type LocalityMapMarker } from '@/components/lawyers/LocalityMapPreview';

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

  const areas = lawyer.practiceAreas;
  const city = lawyer.city?.name ?? lawyer.barCouncilState;
  const languages = lawyer.languages.map((l) => l.language.name);
  const courts = lawyer.courts.map((c) => c.court.name);
  const awards = lawyer.awards ?? [];
  const offices = lawyer.offices ?? [];
  const serves = (lawyer.serviceAreas ?? []).map((s) => s.city);
  const initials = lawyer.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('');
  const verified = lawyer.verificationStatus === 'APPROVED';

  const officeMarkers: LocalityMapMarker[] = offices
    .filter((o) => o.latitude != null && o.longitude != null)
    .map((o) => ({
      id: o.id,
      lat: o.latitude as number,
      lng: o.longitude as number,
      label: o.label || 'Office',
      sublabel: [o.addressLine, o.city.name].filter(Boolean).join(', '),
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Attorney',
    name: lawyer.fullName,
    areaServed: city,
    knowsAbout: areas.map((a) => a.practiceArea.name),
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
    <main id="main" className="bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span>{' '}
          <Link href="/lawyers" className="hover:text-gold">Lawyers{lawyer.city ? ` in ${lawyer.city.name}` : ''}</Link>{' '}
          <span className="mx-1">/</span> <span className="font-medium text-slate-700">{lawyer.fullName}</span>
        </nav>
      </Container>

      <Container as="section" className="py-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-2">
            {/* header card */}
            <header className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  <div
                    aria-hidden="true"
                    className="hero-gradient flex h-28 w-28 items-center justify-center rounded-2xl text-4xl font-extrabold text-gold"
                  >
                    {initials}
                  </div>
                  {verified && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white bg-green-500"
                    />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold text-navy">{lawyer.fullName}</h1>
                      <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                        {verified && (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-600">
                            <Icon name="circle-check" aria-hidden="true" /> Verified
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          {lawyer.barCouncilState}
                        </span>
                      </div>
                    </div>
                    {lawyer.ratingAvg && (
                      <div className="text-sm font-bold text-amber-500">
                        <Icon name="star-fill" aria-hidden="true" /> {lawyer.ratingAvg}{' '}
                        <span className="font-normal text-slate-400">({lawyer.ratingCount} reviews)</span>
                      </div>
                    )}
                  </div>
                  <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 text-left sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</dt>
                      <dd className="text-sm font-semibold text-slate-800">
                        <Icon name="location-dot" aria-hidden="true" className="mr-1 text-gold" /> {city}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Experience</dt>
                      <dd className="text-sm font-semibold text-slate-800">
                        <Icon name="briefcase" aria-hidden="true" className="mr-1 text-gold" /> {lawyer.experienceYears} years
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Languages</dt>
                      <dd className="text-sm font-semibold text-slate-800">
                        <Icon name="language" aria-hidden="true" className="mr-1 text-gold" />{' '}
                        {languages.length ? languages.join(', ') : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </header>

            {/* about */}
            {lawyer.bio && (
              <section aria-labelledby="about-heading" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
                <h2 id="about-heading" className="mb-4 text-lg font-bold text-navy">About</h2>
                <p className="text-sm leading-relaxed text-slate-600">{lawyer.bio}</p>
              </section>
            )}

            {/* practice areas */}
            {areas.length > 0 && (
              <section aria-labelledby="areas-heading" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
                <h2 id="areas-heading" className="mb-6 text-lg font-bold text-navy">Practice Areas &amp; Skills</h2>
                <div className="space-y-5">
                  {areas.map((a) => {
                    const pct = a.proficiency ? Math.min(a.proficiency * 20, 100) : null;
                    return (
                      <div key={a.practiceArea.id}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{a.practiceArea.name}</span>
                          {pct !== null && <span className="text-xs font-bold text-gold">{pct}%</span>}
                        </div>
                        {pct !== null && (
                          <div
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={pct}
                            aria-label={`${a.practiceArea.name} proficiency`}
                            className="h-2 overflow-hidden rounded-full bg-slate-100"
                          >
                            <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* awards — criteria-based platform recognition */}
            {awards.length > 0 && (
              <section aria-labelledby="awards-heading" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
                <h2 id="awards-heading" className="mb-6 text-lg font-bold text-navy">Awards</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {awards.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-gray-200/80 bg-white p-5 text-center shadow-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="hero-gradient mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl text-gold"
                      >
                        <Icon
                          name={
                            a.type === 'CLIENTS_CHOICE'
                              ? 'star-fill'
                              : a.type === 'TOP_RESPONDER'
                                ? 'phone-volume'
                                : 'arrow-trend-up'
                          }
                        />
                      </span>
                      <p className="text-sm font-bold text-navy">{a.title}</p>
                      <span className="mt-2 inline-block rounded-full border border-gray-200 px-3 py-0.5 text-xs font-semibold text-slate-500">
                        {a.year}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-400">
                  Awarded automatically by LawMitran based on client ratings and responsiveness.
                </p>
              </section>
            )}

            {/* offices & service areas */}
            {(offices.length > 0 || serves.length > 0) && (
              <section aria-labelledby="locations-heading" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
                <h2 id="locations-heading" className="mb-4 text-lg font-bold text-navy">Locations</h2>
                {offices.length > 0 && (
                  <div className="space-y-2">
                    {offices.map((o) => (
                      <p key={o.id} className="text-sm text-slate-600">
                        <Icon name="location-dot" aria-hidden="true" className="mr-1.5 text-gold" />
                        <span className="font-semibold text-slate-800">{o.label || 'Office'}</span>, {o.city.name}
                        {o.addressLine ? ` — ${o.addressLine}` : ''}
                        {o.isPrimary && (
                          <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Primary</span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
                {serves.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Also serves clients in</p>
                    <div className="flex flex-wrap gap-2">
                      {serves.map((c) => (
                        <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {officeMarkers.length > 0 && (
                  <div className="mt-4">
                    <LocalityMapPreview markers={officeMarkers} height="240px" />
                  </div>
                )}
              </section>
            )}

            {/* courts */}
            {courts.length > 0 && (
              <section aria-labelledby="courts-heading" className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm md:p-8">
                <h2 id="courts-heading" className="mb-4 text-lg font-bold text-navy">Courts</h2>
                <div className="flex flex-wrap gap-2">
                  {courts.map((c) => (
                    <span key={c} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      <Icon name="gavel" aria-hidden="true" className="mr-1 text-gold" /> {c}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: contact card */}
          <aside className="lg:col-span-1">
            <div className="hero-gradient rounded-2xl p-6 text-white shadow-xl lg:sticky lg:top-24">
              <div
                className="mb-4 rounded-xl border border-dashed border-gold/50 bg-white/5 py-3 text-center text-sm tracking-wide text-gold"
              >
                <Icon name="lock" aria-hidden="true" className="mr-1" /> Contact shared after you submit
              </div>

              <Link
                href={`/lawyers?lawyer=${lawyer.id}`}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-bold text-navy transition-colors hover:bg-[#b58f3f]"
              >
                <Icon name="phone-volume" aria-hidden="true" /> Contact Lawyer
              </Link>
              <p className="text-center text-[11px] text-slate-400">
                Submit your requirement and the lawyer contacts you directly (login required). No in-app scheduling.
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          LawMitran is an information platform, not a law firm. Listings are informational and not an
          endorsement or solicitation.
        </p>
      </Container>
    </main>
  );
}
