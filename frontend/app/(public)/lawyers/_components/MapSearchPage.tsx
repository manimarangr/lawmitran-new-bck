'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { APIProvider } from '@vis.gl/react-google-maps';
import { FilterSidebar } from './FilterSidebar';
import { LawyerMap } from './LawyerMap';
import { LawyerCardList } from './LawyerCardList';
import { DeepLinkOpener } from './DeepLinkOpener';
import { LeadModal } from '@/components/LeadModal';
import Icon from '@/components/ui/Icon';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/**
 * Dedicated map-search layout (sample-ui/lawyer-search-map.html) — a left
 * results column (filters + card list together, one unit) beside a
 * full-height map. Deliberately its own composition, not the list-view
 * page's FilterSidebar rail + stacked map/list.
 */
export function MapSearchPage() {
  const { leadLawyerId, setLeadLawyerId } = useLawyerSearchStore();

  if (!MAPS_API_KEY) {
    return (
      <main id="main" className="flex h-[calc(100vh-74px)] items-center justify-center">
        <div className="max-w-sm rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-semibold text-slate-600">Map view is unavailable right now.</p>
          <Link href="/lawyers" className="mt-3 inline-block text-sm font-bold text-navy hover:text-gold">
            ← Back to list view
          </Link>
        </div>
      </main>
    );
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <main id="main" className="flex h-[calc(100vh-74px)] overflow-hidden">
        {/* LEFT: filters + results, one scroll unit — matches the sample-ui column */}
        <section className="flex h-full w-full flex-shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white shadow-sm lg:w-[420px]">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-2">
            <p className="text-xs text-slate-500">Pan the map, then “Search this area”.</p>
            <Link
              href="/lawyers"
              className="rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-gold"
            >
              <Icon name="sliders" aria-hidden="true" className="mr-1" /> List view
            </Link>
          </div>
          <FilterSidebar variant="map" />
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4">
            <LawyerCardList />
          </div>
        </section>

        {/* RIGHT: map fills the remaining space */}
        <section className="relative h-full flex-1">
          <LawyerMap />
        </section>
      </main>

      {leadLawyerId && <LeadModal lawyerId={leadLawyerId} onClose={() => setLeadLawyerId(null)} />}
      <Suspense><DeepLinkOpener /></Suspense>
    </APIProvider>
  );
}
