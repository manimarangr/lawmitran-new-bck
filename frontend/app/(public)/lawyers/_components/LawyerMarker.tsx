'use client';

import { useState } from 'react';
import { AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import Link from 'next/link';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import type { LawyerMarker as LawyerMarkerType } from '@/types/lawyer';

export function LawyerMarkerPin({ marker }: { marker: LawyerMarkerType }) {
  const { selectedLawyerId, hoveredLawyerId, setSelectedLawyerId } = useLawyerSearchStore();
  const [showInfo, setShowInfo] = useState(false);

  if (!marker.latitude || !marker.longitude) return null;

  const isSelected = selectedLawyerId === marker.id;
  const isHovered = hoveredLawyerId === marker.id;
  const isActive = isSelected || isHovered;
  const rating = marker.ratingAvg ? parseFloat(marker.ratingAvg).toFixed(1) : null;
  const topArea = marker.practiceAreas[0]?.practiceArea.name;

  function handleClick() {
    setSelectedLawyerId(marker.id);
    setShowInfo(true);
    const card = document.getElementById(`lawyer-card-${marker.id}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <AdvancedMarker
      position={{ lat: marker.latitude, lng: marker.longitude }}
      onClick={handleClick}
      zIndex={isActive ? 10 : 1}
    >
      <div
        className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md transition-transform cursor-pointer select-none
          ${isActive
            ? 'bg-blue-600 text-white scale-110'
            : 'bg-white text-zinc-800 border border-zinc-300 hover:scale-105'
          }`}
      >
        {rating && <span className="text-amber-400">★</span>}
        <span>{rating ?? marker.fullName.split(' ')[0]}</span>
      </div>

      {showInfo && (
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
