'use client';

import { useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import Icon from '@/components/ui/Icon';

const DEFAULT_RADIUS_KM = 25;

/** Crosshairs button on the map: browser geolocation → point-radius "near me" search, distance-sorted. */
export function UseMyLocationButton() {
  const map = useMap();
  const { filters, setFilters, setUserLocation } = useLawyerSearchStore();
  const [locating, setLocating] = useState(false);

  function handleClick() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocating(false);
        setUserLocation({ lat: latitude, lng: longitude });
        setFilters({
          ...filters,
          lat: latitude,
          lng: longitude,
          radiusKm: DEFAULT_RADIUS_KM,
          sort: 'distance',
        });
        map?.panTo({ lat: latitude, lng: longitude });
        map?.setZoom(13);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={locating}
      title="Use my location"
      aria-label="Use my location"
      className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-blue-600 shadow-md transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon
        name={locating ? 'spinner' : 'location-crosshairs'}
        aria-hidden="true"
        className={locating ? 'animate-spin' : ''}
      />
    </button>
  );
}
