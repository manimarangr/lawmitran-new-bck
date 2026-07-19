'use client';

/**
 * Homepage lawyer showcase — deliberately neutral (BCI Rule 36):
 *  - only lawyers who can currently receive leads (subscription active/trial)
 *  - ordered by newest verification, never by rating or payment tier
 *  - personalised to the visitor's saved city when we know it
 * No "featured"/"premium" framing anywhere.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLawyers } from '@/lib/api/lawyers';
import { getSavedCity } from '@/lib/geo';
import Icon from '@/components/ui/Icon';
import type { LawyerListItem } from '@/types/lawyer';

export default function HomeLawyers() {
  const [city, setCity] = useState<string | null>(null);
  const [cityLoaded, setCityLoaded] = useState(false);

  useEffect(() => {
    setCity(getSavedCity());
    setCityLoaded(true);
  }, []);

  const q = useQuery({
    queryKey: ['home-lawyers', city],
    queryFn: async () => {
      // Try the visitor's city first; fall back to all-India if it has no one yet.
      if (city) {
        const local = await fetchLawyers({ city, subscribed: '1', sort: 'createdAt' }, 1, 4);
        if (local.items.length > 0) return { items: local.items, local: true };
      }
      const all = await fetchLawyers({ subscribed: '1', sort: 'createdAt' }, 1, 4);
      return { items: all.items, local: false };
    },
    enabled: cityLoaded,
    staleTime: 300_000,
  });

  const items: LawyerListItem[] = q.data?.items ?? [];
  const localised = q.data?.local && city;

  return (
    <section className="bg-bg-soft px-5 pb-10 pt-8">
      <div className="mx-auto max-w-[73.75rem]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[0.78125rem] font-bold uppercase tracking-[.14em] text-gold">
              Bar Council verified
            </span>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-navy">
              {localised ? `Verified lawyers in ${city}` : 'Recently verified lawyers'}
            </h2>
            <span aria-hidden="true" className="mt-2 block h-1 w-12 rounded bg-gold" />
          </div>
          <Link href="/lawyers" className="text-sm font-bold text-navy hover:text-gold">
            View all <Icon name="arrow-right" aria-hidden="true" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-slate-400">
            {q.isLoading ? 'Loading verified lawyers…' : (
              <>
                Verified lawyers are joining LawMitran now —{' '}
                <Link href="/lawyers" className="font-semibold text-gold hover:underline">browse the directory</Link>{' '}
                or{' '}
                <Link href="/signup?role=lawyer" className="font-semibold text-gold hover:underline">join as a lawyer</Link>.
              </>
            )}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((l) => {
              const specialty = l.practiceAreas[0]?.practiceArea.name;
              const initials = l.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('');
              const rating = l.ratingAvg ? parseFloat(l.ratingAvg) : 0;
              return (
                <article key={l.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="relative shrink-0">
                      {l.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.profileImageUrl} alt="" className="h-16 w-16 rounded-full border-2 border-gold-soft object-cover" />
                      ) : (
                        <span aria-hidden="true" className="hero-gradient flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-soft text-lg font-bold text-gold">
                          {initials}
                        </span>
                      )}
                      <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-navy">
                        {l.slug ? (
                          <Link href={`/lawyer/${l.slug}`} className="hover:text-navy-2">{l.fullName}</Link>
                        ) : (
                          l.fullName
                        )}
                      </h3>
                      {specialty && <p className="truncate text-xs text-muted">{specialty} Lawyer</p>}
                      {l.city && (
                        <p className="mt-0.5 text-xs text-muted">
                          <Icon name="location-dot" aria-hidden="true" className="mr-1 text-gold" />
                          {l.city.name}
                        </p>
                      )}
                      {rating > 0 ? (
                        <p className="mt-0.5 text-xs text-gold">
                          <Icon name="star-fill" aria-hidden="true" /> {rating.toFixed(1)}{' '}
                          <span className="text-muted">({l.ratingCount} reviews)</span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted">{l.experienceYears} yrs experience</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Link
                      href={l.slug ? `/lawyer/${l.slug}` : '/lawyers'}
                      className="inline-block rounded-lg border border-gray-200 px-5 py-1.5 text-xs font-semibold text-navy transition hover:border-navy hover:bg-navy hover:text-white"
                    >
                      View Profile
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
