'use client';

import { useCallback, useState } from 'react';
import { AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import Link from 'next/link';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import type { LawyerMarker as LawyerMarkerType } from '@/types/lawyer';

interface LawyerMarkerPinProps {
  marker: LawyerMarkerType;
  /** Registers/unregisters the underlying marker element with the clusterer. */
  setMarkerRef?: (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => void;
}

export function LawyerMarkerPin({ marker, setMarkerRef }: LawyerMarkerPinProps) {
  const { selectedLawyerId, hoveredLawyerId, setSelectedLawyerId, setHoveredLawyerId } = useLawyerSearchStore();
  const [showInfo, setShowInfo] = useState(false);

  if (!marker.latitude || !marker.longitude) return null;

  const isSelected = selectedLawyerId === marker.id;
  const isHovered = hoveredLawyerId === marker.id;
  const isActive = isSelected || isHovered;
  const rating = marker.ratingAvg ? parseFloat(marker.ratingAvg).toFixed(1) : null;
  const topArea = marker.practiceAreas[0]?.practiceArea.name;

  function scrollCardIntoView() {
    const card = document.getElementById(`lawyer-card-${marker.id}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleClick() {
    setSelectedLawyerId(marker.id);
    setShowInfo(true);
    scrollCardIntoView();
  }

  function handleMouseEnter() {
    setHoveredLawyerId(marker.id);
    scrollCardIntoView();
  }

  function handleMouseLeave() {
    setHoveredLawyerId(null);
  }

  // Stable per-marker identity — an inline arrow here would give React a new ref
  // callback every render, causing it to detach/reattach (and re-register with the
  // clusterer) in an infinite loop. Only re-created if setMarkerRef or the id changes.
  const markerRef = useCallback(
    (ref: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef?.(ref, marker.id),
    [setMarkerRef, marker.id],
  );

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: marker.latitude, lng: marker.longitude }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      zIndex={isActive ? 10 : 1}
    >
      <div
        className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md transition-transform cursor-pointer select-none
          ${isActive
            ? 'bg-blue-600 text-white scale-110 animate-marker-bounce'
            : 'bg-white text-zinc-800 border border-zinc-300 hover:scale-105'
          }`}
      >
        {rating && <span className="text-amber-400">★</span>}
        <span>{rating ?? marker.fullName.split(' ')[0]}</span>
      </div>

      {(showInfo || isHovered) && (
        <InfoWindow
          position={{ lat: marker.latitude, lng: marker.longitude }}
          onCloseClick={() => {
            setShowInfo(false);
            setSelectedLawyerId(null);
          }}
          pixelOffset={[0, -36]}
        >
          <div className="p-1 min-w-[180px] space-y-1">
            <p className="font-semibold text-zinc-900 text-sm leading-tight">{marker.fullName}</p>
            {rating && (
              <p className="text-xs text-zinc-500">
                ★ {rating} · {marker.ratingCount} review{marker.ratingCount !== 1 ? 's' : ''}
              </p>
            )}
            {marker.city && <p className="text-xs text-zinc-500">📍 {marker.city.name}</p>}
            {topArea && <p className="text-xs text-zinc-500">{topArea}</p>}
            {marker.distanceKm != null && (
              <p className="text-xs font-semibold text-gold">~{marker.distanceKm} km away</p>
            )}
            <Link
              href={`/lawyers/${marker.id}`}
              className="block mt-2 text-xs font-medium text-blue-600 hover:underline"
            >
              View profile →
            </Link>
          </div>
        </InfoWindow>
      )}
    </AdvancedMarker>
  );
}
