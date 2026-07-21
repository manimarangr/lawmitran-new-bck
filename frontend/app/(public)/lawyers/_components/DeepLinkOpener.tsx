'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { getSavedCity, saveCity } from '@/lib/geo';
import { normalizePracticeArea } from '@/lib/practice-areas';

/** Reads ?lawyer= (contact CTA deep links) and hero params (?city=&practiceArea=). Shared by /lawyers and /lawyers/map. */
export function DeepLinkOpener() {
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
