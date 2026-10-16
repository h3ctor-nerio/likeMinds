"use client";
import { APIProvider } from "@vis.gl/react-google-maps";
import { GOOGLE_KEY } from "@/lib/maps-config";

// Loads the Google Maps JavaScript API once for the whole app (only when a key is set).
export default function MapsProvider({ children }) {
  if (!GOOGLE_KEY) return children;
  return (
    <APIProvider apiKey={GOOGLE_KEY} onLoad={() => {}}>
      {children}
    </APIProvider>
  );
}
