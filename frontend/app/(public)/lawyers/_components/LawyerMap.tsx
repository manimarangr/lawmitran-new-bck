'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useLawyerMarkers } from '@/hooks/useLawyerMarkers';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { LawyerMarkerPin } from './LawyerMarker';
import { SearchThisAreaButton } from './SearchThisAreaButton';
import { UseMyLocationButton } from './UseMyLocationButton';

// Default center: India
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

/** Groups the AdvancedMarker elements into a MarkerClusterer instance as they mount/unmount. */
function useMarkerClusterer() {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markersById, setMarkersById] = useState<Record<string, google.maps.marker.AdvancedMarkerElement>>({});

  useEffect(() => {
    if (!map || clusterer.current) return;
    clusterer.current = new MarkerClusterer({ map });
  }, [map]);

  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markersById));
  }, [markersById]);

  // Stable identity across renders — an unstable ref-callback identity makes React
  // detach/reattach the ref on every render (calls it with null, then the element,
  // forever), which loops: state update -> re-render -> new callback -> repeat.
  const setMarkerRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
    setMarkersById((prev) => {
      if ((marker && prev[id]) || (!marker && !prev[id])) return prev;
      if (marker) return { ...prev, [id]: marker };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return setMarkerRef;
}

function LawyerMapMarkers() {
  const { data: markers = [] } = useLawyerMarkers();
  const setMarkerRef = useMarkerClusterer();
  const { userLocation } = useLawyerSearchStore();

  return (
    <>
      {markers
        .filter((m) => m.latitude && m.longitude)
        .map((m) => (
          <LawyerMarkerPin key={m.id} marker={m} setMarkerRef={setMarkerRef} />
        ))}

      {userLocation && (
        <AdvancedMarker position={userLocation} title="You are here" zIndex={20}>
          <div className="h-[18px] w-[18px] rounded-full border-[3px] border-white bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,.25)]" />
        </AdvancedMarker>
      )}
    </>
  );
}

export function LawyerMap() {
  const { setMapBounds, userLocation } = useLawyerSearchStore();

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={userLocation ?? DEFAULT_CENTER}
        defaultZoom={userLocation ? 13 : DEFAULT_ZOOM}
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
        <LawyerMapMarkers />
      </Map>

      <UseMyLocationButton />
      <SearchThisAreaButton />
    </div>
  );
}
