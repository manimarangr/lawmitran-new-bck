'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { FilterSidebar } from './FilterSidebar';
import { LawyerCardList } from './LawyerCardList';
import { DeepLinkOpener } from './DeepLinkOpener';
import { LeadModal } from '@/components/LeadModal';
import CityInput from '@/components/ui/CityInput';
import Container from '@/components/ui/Container';
import Icon from '@/components/ui/Icon';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { PRACTICE_AREAS } from '@/lib/practice-areas';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function LawyerSearchPage() {
  const { leadLawyerId, setLeadLawyerId, filters, setFilters } = useLawyerSearchStore();
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

  // City/practice area carry over into the map route via the URL (in addition to
  // the shared Zustand store, so a fresh load or shared link stays filtered too).
  const mapHref = (() => {
    const p = new URLSearchParams();
    if (filters.city) p.set('city', filters.city);
    if (filters.practiceArea) p.set('practiceArea', filters.practiceArea);
    const qs = p.toString();
    return qs ? `/lawyers/map?${qs}` : '/lawyers/map';
  })();

  return (
    <main id="main">
      {/* light hero with search card */}
      <header className="hero-light py-10">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span> Find Lawyers
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-4xl">Find a Verified Lawyer</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
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
            {MAPS_API_KEY && (
              <Link
                href={mapHref}
                className="m-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-[15px] font-semibold text-navy transition hover:border-gold"
              >
                <Icon name="map-location-dot" aria-hidden="true" className="text-gold" /> Map
              </Link>
            )}
          </form>
        </Container>
      </header>

      {/* filters + results */}
      <Container className="py-8">
        <div className="grid items-start gap-6 lg:grid-cols-4">
          <FilterSidebar variant="card" />

          <section aria-label="Search results" className="lg:col-span-3">
            <LawyerCardList />
          </section>
        </div>
      </Container>

      {leadLawyerId && <LeadModal lawyerId={leadLawyerId} onClose={() => setLeadLawyerId(null)} />}
      <Suspense><DeepLinkOpener /></Suspense>
    </main>
  );
}
