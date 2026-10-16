"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { DEFAULT_CENTER, GOOGLE_MAP_ID } from "@/lib/maps-config";

/** Fits the view to the items whenever fitKey changes, or flies to `center` when given. */
function Fit({ items, center, zoom, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !window.google) return;
    if (center) {
      map.panTo(center);
      map.setZoom(zoom || 12);
    } else if (items.length > 1) {
      const b = new window.google.maps.LatLngBounds();
      items.forEach((i) => b.extend({ lat: i.lat, lng: i.lng }));
      map.fitBounds(b, 56);
    } else if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, center?.lat, center?.lng]);
  return null;
}

function Pin({ item, selected, setRef }) {
  const ref = useCallback((marker) => setRef(marker, item.id), [setRef, item.id]);
  return (
    <AdvancedMarker
      ref={ref}
      position={{ lat: item.lat, lng: item.lng }}
      title={item.label}
      zIndex={selected ? 1000 : item.kind === "event" ? 2 : 1}
      onClick={() => item.onSelect?.()}
    >
      <div className={`lm-pin ${item.kind} ${selected ? "selected" : ""}`}>{item.label}</div>
    </AdvancedMarker>
  );
}

/** Groups nearby bubbles into a numbered cluster when zoomed out. */
function ClusteredPins({ items, selectedId }) {
  const map = useMap();
  const [markers, setMarkers] = useState({});
  const clusterer = useMemo(() => (map ? new MarkerClusterer({ map }) : null), [map]);

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    clusterer.addMarkers(Object.values(markers));
  }, [clusterer, markers]);
  useEffect(() => () => clusterer?.setMap(null), [clusterer]);

  const setRef = useCallback((marker, key) => {
    setMarkers((prev) => {
      if ((marker && prev[key] === marker) || (!marker && !prev[key])) return prev;
      if (marker) return { ...prev, [key]: marker };
      const { [key]: _gone, ...rest } = prev;
      return rest;
    });
  }, []);

  return items.map((i) => <Pin key={i.id} item={i} selected={i.id === selectedId} setRef={setRef} />);
}

export default function GoogleMapView({ items = [], onPick, pick, center, zoom, short = false, label = "Map", selectedId, userLocation, fitKey, cluster = true }) {
  const placed = items.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng));
  return (
    <div className={`map-wrap ${short ? "short" : ""}`} role="region" aria-label={label}>
      <Map
        mapId={GOOGLE_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={4}
        gestureHandling="greedy"
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        colorScheme="FOLLOW_SYSTEM"
        style={{ width: "100%", height: "100%" }}
        onClick={(e) => {
          const ll = e.detail?.latLng;
          if (ll && onPick) onPick({ lat: ll.lat, lng: ll.lng });
        }}
      >
        <Fit items={placed} center={center} zoom={zoom} fitKey={fitKey ?? placed.length} />
        {cluster ? (
          <ClusteredPins items={placed} selectedId={selectedId} />
        ) : (
          placed.map((i) => (
            <AdvancedMarker key={i.id} position={{ lat: i.lat, lng: i.lng }} title={i.label} onClick={() => i.onSelect?.()}>
              <div className={`lm-pin ${i.kind}`}>{i.label}</div>
            </AdvancedMarker>
          ))
        )}
        {pick && (
          <AdvancedMarker position={pick} title="Your chosen spot" zIndex={2000}>
            <div className="lm-pin pick">Here</div>
          </AdvancedMarker>
        )}
        {userLocation && (
          <AdvancedMarker position={userLocation} title="You are here" zIndex={1500}>
            <div className="lm-me" />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}
