'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { FilterSidebar } from './FilterSidebar';
import { LawyerMap } from './LawyerMap';
import { LawyerCardList } from './LawyerCardList';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function LawyerSearchPage() {
  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <FilterSidebar />

        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Map area — 55% height */}
          <div className="relative" style={{ height: '55%' }}>
            <LawyerMap />
          </div>

          {/* Card list area — 45% height */}
          <div className="flex flex-col overflow-hidden border-t border-zinc-200" style={{ height: '45%' }}>
            <LawyerCardList />
          </div>
        </main>
      </div>
    </APIProvider>
  );
}
