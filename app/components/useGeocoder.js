"use client";
// Place search and reverse geocoding.
// With a Google key: Places API (New) autocomplete + Geocoding API.
// Without one: OpenStreetMap Nominatim (light use only).
import { useCallback, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { USE_GOOGLE } from "@/lib/maps-config";

const AREA_TYPES = {
  neighborhood: ["neighborhood", "sublocality_level_1", "sublocality"],
  town: ["locality", "postal_town", "administrative_area_level_3"],
  region: ["administrative_area_level_2", "administrative_area_level_1"],
};

function googleArea(results, precision) {
  const comps = results.flatMap((r) => r.address_components || []);
  const find = (types) => comps.find((c) => c.types.some((t) => types.includes(t)));
  const state = find(["administrative_area_level_1"])?.short_name;
  const town = find(AREA_TYPES.town)?.long_name;
  if (precision === "neighborhood") {
    const hood = find(AREA_TYPES.neighborhood)?.long_name;
    return [hood, town].filter(Boolean).join(", ") || [town, state].filter(Boolean).join(", ");
  }
  if (precision === "town") return [town, state].filter(Boolean).join(", ");
  const county = find(["administrative_area_level_2"])?.long_name;
  const country = find(["country"])?.long_name;
  return [county, state || country].filter(Boolean).join(", ");
}

function useGoogleGeocoder() {
  const places = useMapsLibrary("places");
  const geocoding = useMapsLibrary("geocoding");
  const token = useRef(null);

  const search = useCallback(
    async (input, bias) => {
      if (!places || !input.trim()) return [];
      if (!token.current) token.current = new places.AutocompleteSessionToken();
      const request = { input, sessionToken: token.current };
      if (bias) request.locationBias = { center: bias, radius: 50000 };
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      return suggestions
        .filter((s) => s.placePrediction)
        .slice(0, 6)
        .map((s) => ({
          id: s.placePrediction.placeId,
          label: s.placePrediction.text.toString(),
          resolve: async () => {
            const place = s.placePrediction.toPlace();
            await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
            token.current = null; // a session ends when a place is chosen
            return {
              lat: place.location.lat(),
              lng: place.location.lng(),
              label: place.formattedAddress || place.displayName,
              name: place.displayName || "",
            };
          },
        }));
    },
    [places]
  );

  const reverse = useCallback(
    async (lat, lng, precision = "town") => {
      if (!geocoding) return "";
      try {
        const { results } = await new geocoding.Geocoder().geocode({ location: { lat, lng } });
        return googleArea(results || [], precision);
      } catch {
        return "";
      }
    },
    [geocoding]
  );

  return { search, reverse, ready: Boolean(places && geocoding), provider: "google" };
}

function useOsmGeocoder() {
  const search = useCallback(async (input) => {
    if (!input.trim()) return [];
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(input)}`, {
      headers: { "Accept-Language": navigator.language || "en" },
    });
    const rows = res.ok ? await res.json() : [];
    return rows.map((r) => ({
      id: String(r.place_id),
      label: r.display_name,
      resolve: async () => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name, name: r.name || "" }),
    }));
  }, []);

  const reverse = useCallback(async (lat, lng, precision = "town") => {
    const zoom = { neighborhood: 15, town: 10, region: 7 }[precision] || 10;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=${zoom}&lat=${lat}&lon=${lng}`);
      const a = (await res.json()).address || {};
      const town = a.city || a.town || a.village || a.municipality;
      if (precision === "neighborhood") return [a.neighbourhood || a.suburb || a.quarter, town].filter(Boolean).join(", ");
      if (precision === "town") return [town, a.state].filter(Boolean).join(", ");
      return [a.county, a.state || a.country].filter(Boolean).join(", ");
    } catch {
      return "";
    }
  }, []);

  return { search, reverse, ready: true, provider: "osm" };
}

// The provider is fixed at build time, so the same hook runs on every render.
export const useGeocoder = USE_GOOGLE ? useGoogleGeocoder : useOsmGeocoder;
