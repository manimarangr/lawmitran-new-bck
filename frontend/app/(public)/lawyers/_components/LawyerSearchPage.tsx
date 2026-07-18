'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import Link from 'next/link';
import { FilterSidebar } from './FilterSidebar';
import { LawyerMap } from './LawyerMap';
import { LawyerCardList } from './LawyerCardList';
import { LeadModal } from '@/components/LeadModal';
import SiteFooter from '@/components/site/SiteFooter';
import CityInput from '@/components/ui/CityInput';
import Icon from '@/components/ui/Icon';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { detectCity, getSavedCity, saveCity } from '@/lib/geo';
import { PRACTICE_AREAS, normalizePracticeArea } from '@/lib/practice-areas';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** Reads ?lawyer= (contact CTA deep links) and hero params (?city=&practiceArea=). */
function DeepLinkOpener() {
  const params = useSearchParams();
  const { setLeadLawyerId, setFilters, filters } = useLawyerSearchStore();

  useEffect(() => {
    const lawyer = params.get('lawyer');
    if (lawyer) setLeadLawyerId(lawyer);
    const city = params.get('city') ?? undefined;
    // Normalize loose values ("Property", "criminal") to the canonical seeded
    // name — the search API matches practice area with exact equality.
    const practiceArea = normalizePracticeArea(params.get('practiceArea'));
    if (city || practiceArea) {
      setFilters({ ...filters, ...(city ? { city } : {}), ...(practiceArea ? { practiceArea } : {}) });
      if (city) saveCity(city);
    } else if (!filters.city) {
      // no explicit city → reuse the last detected/used one
      const saved = getSavedCity();
      if (saved) setFilters({ ...filters, city: saved });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return null;
}

export function LawyerSearchPage() {
  const { leadLawyerId, setLeadLawyerId, filters, setFilters } = useLawyerSearchStore();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [heroArea, setHeroArea] = useState('');
  const [heroCity, setHeroCity] = useState('');

  // Reflect active filters (deep links like /lawyers?practiceArea=…&city=…,
  // sidebar changes, saved city) in the hero search card.
  useEffect(() => {
    setHeroArea(filters.practiceArea ?? '');
    setHeroCity(filters.city ?? '');
  }, [filters.practiceArea, filters.city]);

  function heroSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      ...filters,
      ...(heroArea ? { practiceArea: heroArea } : {}),
      ...(heroCity ? { city: heroCity } : {}),
    };
    // Locality belongs to a specific city — drop it when the city changes.
    if (heroCity && heroCity !== filters.city) delete next.locality;
    setFilters(next);
  }

  // ---------- MAP VIEW (secondary) ----------
  if (view === 'map' && MAPS_API_KEY) {
    return (
      <APIProvider apiKey={MAPS_API_KEY}>
        <div className="flex h-[calc(100vh-74px)] overflow-hidden">
          <FilterSidebar variant="rail" />
          <main id="main" className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2">
              <p className="text-xs text-slate-500">Pan the map, then “Search this area”.</p>
              <button
                onClick={() => setView('list')}
                className="rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-gold"
              >
                <Icon name="sliders" aria-hidden="true" className="mr-1" /> List view
              </button>
            </div>
            <div className="relative" style={{ height: '55%' }}>
              <LawyerMap />
            </div>
            <div className="flex flex-col overflow-y-auto border-t border-line" style={{ height: '45%' }}>
              <LawyerCardList />
            </div>
          </main>
          {leadLawyerId && <LeadModal lawyerId={leadLawyerId} onClose={() => setLeadLawyerId(null)} />}
          <Suspense><DeepLinkOpener /></Suspense>
        </div>
      </APIProvider>
    );
  }

  // ---------- LIST VIEW (default, sample-ui style) ----------
  return (
    <main id="main">
      {/* dark hero with search card */}
      <header className="hero-gradient py-10 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-300">
            <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span> Find Lawyers
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Find a Verified Lawyer</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Search Bar Council–verified advocates by practice area, city, and language. Submit a
            requirement and the lawyer reaches out to you.
          </p>

          <form
            onSubmit={heroSearch}
            role="search"
            aria-label="Search lawyers"
            className="mt-6 flex max-w-3xl flex-col items-stretch rounded-2xl bg-white p-2 shadow-xl sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 px-4 py-2.5 text-left">
              <Icon name="gavel" aria-hidden="true" className="text-gold" />
              <div className="min-w-0 flex-1">
                <label htmlFor="ls-area" className="mb-0.5 block text-[11px] font-bold uppercase tracking-[.1em] text-muted">
                  Practice Area
                </label>
                <select
                  id="ls-area"
                  value={heroArea}
                  onChange={(e) => setHeroArea(e.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-navy outline-none"
                >
                  <option value="">All areas</option>
                  {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 border-t border-line px-4 py-2.5 text-left sm:border-l sm:border-t-0">
              <Icon name="location-dot" aria-hidden="true" className="text-gold" />
              <div className="min-w-0 flex-1">
                <label htmlFor="ls-city" className="mb-0.5 block text-[11px] font-bold uppercase tracking-[.1em] text-muted">
                  City
                </label>
                <CityInput
                  id="ls-city"
                  type="text"
                  value={heroCity}
                  onChange={(e) => setHeroCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full bg-transparent text-[15px] font-medium text-navy outline-none placeholder:text-[#9aa3b2]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="m-1 flex items-center justify-center gap-2 rounded-xl bg-navy px-8 py-3 text-[15px] font-bold text-white transition hover:bg-navy-2"
            >
              <Icon name="magnifying-glass" aria-hidden="true" /> Search
            </button>
          </form>
        </div>
      </header>

      {/* filters + results */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid items-start gap-6 lg:grid-cols-4">
          <FilterSidebar variant="card" />

          <section aria-label="Search results" className="lg:col-span-3">
            {MAPS_API_KEY && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setView('map')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-gold"
                >
                  <Icon name="map-location-dot" aria-hidden="true" className="mr-1.5 text-gold" /> Map view
                </button>
              </div>
            )}
            <LawyerCardList />
          </section>
        </div>
      </div>

      {leadLawyerId && <LeadModal lawyerId={leadLawyerId} onClose={() => setLeadLawyerId(null)} />}
      <Suspense><DeepLinkOpener /></Suspense>
      <SiteFooter />
    </main>
  );
}
