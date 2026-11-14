export type ProviderSource = "google_places" | "npi_registry";

export type LatLng = { lat: number; lng: number };

// One real provider from an outside directory. Every field comes from the
// source's response; nothing is filled in by us. Neither source tells whether
// a provider is in the user's insurance network, so that is never claimed.
export type ProviderResult = {
  source: ProviderSource;
  externalId: string;
  name: string;
  address: string;
  // Specialty as the source states it (NPI taxonomy). Google Places: null.
  specialty: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  location: LatLng | null;
  distanceMeters: number | null;
  mapsUrl: string | null;
  networkStatus: "not_verified";
};
