import { z } from "zod";
import { distanceMeters } from "./distance";
import type { LatLng, ProviderResult } from "./types";

// Free geocoding for registry results, which come without coordinates:
// - the ZIP code's center from OpenStreetMap Nominatim (ODbL; low volume,
//   identified as this app, as its usage policy asks);
// - each provider's street address from the US Census Bureau geocoder
//   (official, no key).
// Any failure leaves the distance empty; it never blocks the search.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const TIMEOUT_MS = 6_000;
const USER_AGENT = "Recheck/1.0 (+https://business-cup-production.up.railway.app)";

const nominatimSchema = z.array(z.object({ lat: z.coerce.number(), lon: z.coerce.number() }));

const censusSchema = z.object({
  result: z.object({
    addressMatches: z.array(z.object({ coordinates: z.object({ x: z.number(), y: z.number() }) })),
  }),
});

const validPoint = (point: LatLng) =>
  Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;

export async function zipCenter(zip: string): Promise<LatLng | null> {
  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("postalcode", zip);
    url.searchParams.set("country", "us");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const parsed = nominatimSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.length === 0) return null;
    const point = { lat: parsed.data[0].lat, lng: parsed.data[0].lon };
    return validPoint(point) ? point : null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    const url = new URL(CENSUS_URL);
    url.searchParams.set("address", address);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const parsed = censusSchema.safeParse(await response.json());
    const match = parsed.success ? parsed.data.result.addressMatches[0] : undefined;
    if (!match) return null;
    const point = { lat: match.coordinates.y, lng: match.coordinates.x };
    return validPoint(point) ? point : null;
  } catch {
    return null;
  }
}

// Adds a straight-line distance from the ZIP center to providers that have
// none. Providers whose address can't be found keep a null distance.
export async function addDistances(providers: ProviderResult[], zip: string): Promise<ProviderResult[]> {
  if (providers.length === 0 || providers.every((provider) => provider.distanceMeters !== null)) return providers;
  const center = await zipCenter(zip);
  if (!center) return providers;
  return Promise.all(
    providers.map(async (provider) => {
      if (provider.distanceMeters !== null) return provider;
      const location = provider.location ?? (await geocodeAddress(provider.address));
      if (!location) return provider;
      return { ...provider, location, distanceMeters: Math.round(distanceMeters(center, location)) };
    }),
  );
}
