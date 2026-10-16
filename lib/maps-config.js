export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
export const USE_GOOGLE = Boolean(GOOGLE_KEY);
export const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

export const PRECISIONS = [
  { value: "neighborhood", label: "My neighborhood", detail: "about 500 m off" },
  { value: "town", label: "My town or city", detail: "a few km off" },
  { value: "region", label: "My region", detail: "tens of km off" },
];

export function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
