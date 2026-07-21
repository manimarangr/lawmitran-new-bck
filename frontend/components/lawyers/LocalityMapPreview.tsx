'use client';

import { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import Link from 'next/link';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface LocalityMapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
}

interface Props {
  markers: LocalityMapMarker[];
  height?: string;
  zoom?: number;
}

/** Read-only map embed for SEO/profile pages — static pins, no search-store wiring. */
export function LocalityMapPreview({ markers, height = '320px', zoom = 12 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!MAPS_API_KEY || markers.length === 0) return null;

  const center = {
    lat: markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
    lng: markers.reduce((sum, m) => sum + m.lng, 0) / markers.length,
  };
  const active = markers.find((m) => m.id === openId);

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <div
        className="overflow-hidden rounded-2xl border border-gray-200/60 shadow-sm"
        style={{ height }}
      >
        <Map
          defaultCenter={center}
          defaultZoom={markers.length === 1 ? 14 : zoom}
          gestureHandling="cooperative"
          disableDefaultUI
          mapId="lawmitran-locality-preview"
        >
          {markers.map((m) => (
            <AdvancedMarker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              onClick={() => setOpenId(m.id)}
            >
              <div className="h-4 w-4 rounded-full border-2 border-white bg-navy shadow-md ring-1 ring-gold" />
            </AdvancedMarker>
          ))}

          {active && (
            <InfoWindow
              position={{ lat: active.lat, lng: active.lng }}
              onCloseClick={() => setOpenId(null)}
              pixelOffset={[0, -20]}
            >
              <div className="min-w-[160px] space-y-1 p-1">
                <p className="text-sm font-semibold text-zinc-900">{active.label}</p>
                {active.sublabel && <p className="text-xs text-zinc-500">{active.sublabel}</p>}
                {active.href && (
                  <Link
                    href={active.href}
                    className="mt-1 block text-xs font-medium text-blue-600 hover:underline"
                  >
                    View profile →
                  </Link>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
