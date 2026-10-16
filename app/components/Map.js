"use client";
import dynamic from "next/dynamic";
import { USE_GOOGLE } from "@/lib/maps-config";

const loading = () => <div className="map-wrap empty">Loading map…</div>;

// Google Maps when a key is configured, OpenStreetMap otherwise. Both take the same props:
// items [{ id, lat, lng, label, kind: "thought" | "event", onSelect }], pick, onPick,
// center, zoom, selectedId, userLocation, fitKey, short, label
const MapImpl = USE_GOOGLE
  ? dynamic(() => import("./GoogleMapView"), { ssr: false, loading })
  : dynamic(() => import("./MapView"), { ssr: false, loading });

export default MapImpl;
