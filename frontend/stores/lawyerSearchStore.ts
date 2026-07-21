import { create } from 'zustand';
import type { MapBounds, SearchFilters } from '@/types/lawyer';

interface LawyerSearchState {
  filters: SearchFilters;
  page: number;
  mapBounds: MapBounds | null;
  pendingBounds: MapBounds | null; // bounds after pan, before "search this area" click
  selectedLawyerId: string | null;
  hoveredLawyerId: string | null;
  /** Lawyer the client is submitting a requirement to (opens the lead modal). */
  leadLawyerId: string | null;
  /** Client's own position from the map's "Use my location" button — drives the "you are here" pin. */
  userLocation: { lat: number; lng: number } | null;

  setFilters: (filters: SearchFilters) => void;
  setPage: (page: number) => void;
  setMapBounds: (bounds: MapBounds) => void;
  confirmBounds: () => void; // commit pendingBounds → mapBounds
  setSelectedLawyerId: (id: string | null) => void;
  setHoveredLawyerId: (id: string | null) => void;
  setLeadLawyerId: (id: string | null) => void;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  resetFilters: () => void;
}

export const useLawyerSearchStore = create<LawyerSearchState>((set) => ({
  filters: {},
  page: 1,
  mapBounds: null,
  pendingBounds: null,
  selectedLawyerId: null,
  hoveredLawyerId: null,
  leadLawyerId: null,
  userLocation: null,

  setFilters: (filters) => set({ filters, page: 1 }),
  setPage: (page) => set({ page }),
  setMapBounds: (bounds) => set({ pendingBounds: bounds }),
  confirmBounds: () =>
    set((s) => ({ mapBounds: s.pendingBounds, pendingBounds: null, page: 1 })),
  setSelectedLawyerId: (id) => set({ selectedLawyerId: id }),
  setHoveredLawyerId: (id) => set({ hoveredLawyerId: id }),
  setLeadLawyerId: (id) => set({ leadLawyerId: id }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  resetFilters: () => set({ filters: {}, page: 1, mapBounds: null, pendingBounds: null, userLocation: null }),
}));
