import { z } from "zod";
import { distanceMeters } from "./distance";
import type { LatLng, ProviderResult } from "./types";

// Google Places API (New), Text Search:
// https://developers.google.com/maps/documentation/places/web-service/text-search
const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const TIMEOUT_MS = 8_000;
// About 10 miles. Location bias accepts a radius of 0 to 50,000 meters.
export const SEARCH_RADIUS_METERS = 16_000;
// Text Search returns at most 20 places per page.
const MAX_PAGE_SIZE = 20;

const PROVIDER_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
].join(",");
const GEOCODE_FIELDS = "places.formattedAddress,places.location";

const locationSchema = z.object({ latitude: z.number(), longitude: z.number() });

const placeSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  // Missing for service-area businesses without a storefront; those are skipped.
  formattedAddress: z.string().min(1),
  location: locationSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  websiteUri: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  googleMapsUri: z.string().optional(),
});

// `places` is left out of the response when nothing matches.
const searchResponseSchema = z.object({ places: z.array(z.unknown()).optional() });

async function searchText(
  body: Record<string, unknown>,
  fieldMask: string,
  apiKey: string,
): Promise<unknown[]> {
  const response = await fetch(SEARCH_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Google Places search failed with status ${response.status}`);
  }
  const parsed = searchResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Google Places returned an unexpected response");
  return parsed.data.places ?? [];
}

const toLatLng = (location: z.infer<typeof locationSchema>): LatLng => ({
  lat: location.latitude,
  lng: location.longitude,
});

// Center of a US ZIP code, or null when Google does not resolve it to that ZIP.
export async function geocodeZip(zip: string, apiKey: string): Promise<LatLng | null> {
  const places = await searchText(
    { textQuery: zip, regionCode: "US", languageCode: "en", pageSize: 1 },
    GEOCODE_FIELDS,
    apiKey,
  );
  const first = z
    .object({ formattedAddress: z.string(), location: locationSchema })
    .safeParse(places[0]);
  if (!first.success || !first.data.formattedAddress.includes(zip)) return null;
  return toLatLng(first.data.location);
}

function toProviderResult(place: z.infer<typeof placeSchema>, center: LatLng): ProviderResult {
  const location = place.location ? toLatLng(place.location) : null;
  return {
    source: "google_places",
    externalId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    specialty: null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    location,
    distanceMeters: location ? Math.round(distanceMeters(center, location)) : null,
    mapsUrl: place.googleMapsUri ?? null,
    networkStatus: "not_verified",
  };
}

// Places matching `query`, preferring ones within SEARCH_RADIUS_METERS of `center`.
export async function searchPlaces(input: {
  query: string;
  center: LatLng;
  apiKey: string;
  limit: number;
}): Promise<ProviderResult[]> {
  const places = await searchText(
    {
      textQuery: input.query,
      regionCode: "US",
      languageCode: "en",
      pageSize: Math.min(Math.max(1, input.limit), MAX_PAGE_SIZE),
      locationBias: {
        circle: {
          center: { latitude: input.center.lat, longitude: input.center.lng },
          radius: SEARCH_RADIUS_METERS,
        },
      },
    },
    PROVIDER_FIELDS,
    input.apiKey,
  );
  return places.flatMap((raw) => {
    const place = placeSchema.safeParse(raw);
    return place.success ? [toProviderResult(place.data, input.center)] : [];
  });
}
