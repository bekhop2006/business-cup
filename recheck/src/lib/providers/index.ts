import { z } from "zod";
import { addDistances } from "./geocode";
import { searchNpi } from "./npi";
import { geocodeZip, searchPlaces } from "./places";
import type { ProviderResult, ProviderSource } from "./types";

export type { LatLng, ProviderResult, ProviderSource } from "./types";

export const zipSchema = z.string().regex(/^\d{5}$/);

export type FindProvidersResult = {
  providers: ProviderResult[];
  // Where the providers came from; null when no source could be reached.
  source: ProviderSource | null;
  error?: "invalid_zip" | "unavailable";
};

type FindProvidersInput = {
  // Free text for Google Places, for example "sports medicine clinic".
  placesQuery: string;
  // NPI taxonomy description, for example "sports medicine".
  npiTaxonomy: string;
  zip: string;
  placesApiKey?: string;
  limit: number;
};

// Logs the source and a short reason only; never the ZIP or the query.
function logFailure(source: ProviderSource, error: unknown) {
  const reason = error instanceof Error ? error.message : "unknown";
  console.error("Provider search failed", { source, reason });
}

function sortByDistance(providers: ProviderResult[]): ProviderResult[] {
  const distance = (provider: ProviderResult) => provider.distanceMeters ?? Number.POSITIVE_INFINITY;
  return [...providers].sort((a, b) =>
    distance(a) === distance(b) ? 0 : distance(a) - distance(b),
  );
}

async function searchGooglePlaces(input: FindProvidersInput, apiKey: string) {
  try {
    const center = await geocodeZip(input.zip, apiKey);
    if (!center) throw new Error("ZIP code not found");
    return await searchPlaces({ query: input.placesQuery, center, apiKey, limit: input.limit });
  } catch (error) {
    logFailure("google_places", error);
    return [];
  }
}

// Real providers near a ZIP code. Google Places is used when a key is given;
// the NPI Registry is the fallback when there is no key or Places fails or
// finds nothing. If both fail, the list is empty: nothing is ever made up.
export async function findProviders(input: FindProvidersInput): Promise<FindProvidersResult> {
  if (!zipSchema.safeParse(input.zip).success) {
    return { providers: [], source: null, error: "invalid_zip" };
  }

  if (input.placesApiKey) {
    const places = await searchGooglePlaces(input, input.placesApiKey);
    if (places.length > 0) return { providers: sortByDistance(places), source: "google_places" };
  }

  try {
    const providers = await searchNpi({ taxonomy: input.npiTaxonomy, zip: input.zip, limit: input.limit });
    // The registry has no coordinates; free geocoders add a distance where they can.
    const withDistances = await addDistances(providers, input.zip);
    return { providers: sortByDistance(withDistances), source: "npi_registry" };
  } catch (error) {
    logFailure("npi_registry", error);
    return { providers: [], source: null, error: "unavailable" };
  }
}
