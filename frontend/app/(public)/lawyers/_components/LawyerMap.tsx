'use client';

import { Map } from '@vis.gl/react-google-maps';
import { useLawyerMarkers } from '@/hooks/useLawyerMarkers';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { LawyerMarkerPin } from './LawyerMarker';
import { SearchThisAreaButton } from './SearchThisAreaButton';

// Default center: India
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

export function LawyerMap() {
  const { data: markers = [] } = useLawyerMarkers();
  const { setMapBounds } = useLawyerSearchStore();

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="lawmitran-lawyer-map"
        onBoundsChanged={(e) => {
          const b = e.map.getBounds();
          if (!b) return;
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          setMapBounds({
            swLat: sw.lat(),
            swLng: sw.lng(),
            neLat: ne.lat(),
            neLng: ne.lng(),
          });
        }}
      >
        {markers
          .filter((m) => m.latitude && m.longitude)
          .map((m) => (
            <LawyerMarkerPin key={m.id} marker={m} />
          ))}
      </Map>

      <SearchThisAreaButton />
    </div>
  );
}
