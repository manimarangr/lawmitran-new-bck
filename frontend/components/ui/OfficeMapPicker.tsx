'use client';

/**
 * Office location picker (docs/28 onboarding v2), ported from
 * sample-ui/lawyer-practice-review.html: Leaflet map (CDN, no npm dep),
 * draggable pin, address "Locate" via OpenStreetMap Nominatim, and
 * browser geolocation ("Use my location").
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const INDIA_CENTER: [number, number] = [21.15, 79.09];

// Minimal typings for the Leaflet global we use
interface LMarker {
  on(ev: string, fn: () => void): void;
  getLatLng(): { lat: number; lng: number };
  setLatLng(ll: [number, number]): void;
}
interface LMap {
  setView(ll: [number, number], zoom: number): void;
  on(ev: string, fn: (e: { latlng: { lat: number; lng: number } }) => void): void;
  remove(): void;
}
interface LeafletGlobal {
  map(el: HTMLElement): LMap;
  tileLayer(url: string, opts: { attribution: string; maxZoom: number }): { addTo(m: LMap): void };
  marker(ll: [number, number], opts: { draggable: boolean }): LMarker & { addTo(m: LMap): LMarker };
}

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

let leafletPromise: Promise<LeafletGlobal> | null = null;
function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet failed to load')));
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export interface OfficePoint {
  lat: number;
  lng: number;
}

/** Address parts resolved from a map point (reverse geocoding). */
export interface ResolvedAddress {
  addressLine: string;
  pincode: string;
  locality: string;
  city: string;
  label: string;
}

export default function OfficeMapPicker({
  value,
  onChange,
  onAddressResolved,
  searchHint,
}: {
  value: OfficePoint | null;
  onChange: (p: OfficePoint) => void;
  /** Called whenever the pin moves and the address behind it is resolved. */
  onAddressResolved?: (a: ResolvedAddress) => void;
  /** Appended to the address search to improve geocoding, e.g. the chosen city. */
  searchHint?: string;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAddressRef = useRef(onAddressResolved);
  onAddressRef.current = onAddressResolved;
  // Nominatim asks for <=1 req/sec — debounce pin moves before resolving.
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [mapError, setMapError] = useState('');
  const [notice, setNotice] = useState('');

  /** lat/lng → address parts (OpenStreetMap Nominatim, same source as Locate). */
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!onAddressRef.current) return;
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`,
          { headers: { Accept: 'application/json' } },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          display_name?: string;
          address?: Record<string, string>;
        };
        const a = data.address ?? {};
        const addressLine = [
          a.house_number,
          a.road ?? a.pedestrian ?? a.neighbourhood,
          a.suburb ?? a.village ?? a.town,
        ]
          .filter(Boolean)
          .join(', ');
        onAddressRef.current?.({
          addressLine,
          pincode: a.postcode ?? '',
          locality: a.suburb ?? a.neighbourhood ?? a.village ?? '',
          city: a.city ?? a.town ?? a.state_district ?? '',
          label: data.display_name ?? '',
        });
      } catch {
        /* offline or rate-limited — the pin still works */
      }
    }, 600);
  }, []);

  const place = useCallback((lat: number, lng: number, zoom = 15) => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng], { draggable: true }).addTo(map);
      m.on('dragend', () => {
        const ll = m.getLatLng();
        onChangeRef.current({ lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5) });
        reverseGeocode(ll.lat, ll.lng);
      });
      markerRef.current = m;
    }
    map.setView([lat, lng], zoom);
    onChangeRef.current({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        map.setView(value ? [value.lat, value.lng] : INDIA_CENTER, value ? 15 : 5);
        map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
        if (value) place(value.lat, value.lng);
      })
      .catch(() => setMapError('Map could not load — you can still submit; enter the address and PIN.'));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function locate() {
    const q = [address.trim(), searchHint, 'India'].filter(Boolean).join(', ');
    if (!address.trim()) {
      setNotice('Type your office address first, then press Locate.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } },
      );
      const hits = (await res.json()) as { lat: string; lon: string }[];
      if (hits[0]) {
        place(Number(hits[0].lat), Number(hits[0].lon), 16);
      } else {
        setNotice('Address not found — click the map or drag the pin to set the point.');
      }
    } catch {
      setNotice('Search unavailable — click the map or drag the pin to set the point.');
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNotice('Location is not available in this browser.');
      return;
    }
    setNotice('');
    navigator.geolocation.getCurrentPosition(
      (pos) => place(pos.coords.latitude, pos.coords.longitude, 16),
      () => setNotice('Could not get your location — allow location access or drag the pin.'),
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Office location <span className="font-medium normal-case text-slate-400">— helps clients find you on the map</span>
        </span>
        <button type="button" onClick={useMyLocation} className="text-xs font-semibold text-gold hover:underline">
          <Icon name="location-crosshairs" aria-hidden="true" className="mr-1" /> Use my location
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void locate(); } }}
          placeholder="Search your office address…"
          aria-label="Search office address"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void locate()}
          disabled={busy}
          className="shrink-0 rounded-xl bg-navy px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? '…' : 'Locate'}
        </button>
      </div>
      {mapError ? (
        <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{mapError}</p>
      ) : (
        <div ref={mapEl} className="mt-3 h-56 w-full rounded-xl border border-gray-200" aria-label="Office location map" />
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        <Icon name="hand-pointer" aria-hidden="true" className="mr-1" />
        Click the map or drag the pin to set your exact office point.{' '}
        {value ? (
          <b className="text-slate-600">Pinned at {value.lat}, {value.lng}</b>
        ) : (
          <b className="text-amber-600">No location set yet.</b>
        )}
      </p>
      {notice && <p role="status" className="mt-1 text-[11px] text-amber-600">{notice}</p>}
    </div>
  );
}
