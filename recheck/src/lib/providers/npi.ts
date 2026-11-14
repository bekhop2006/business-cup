import { z } from "zod";
import type { ProviderResult } from "./types";

// NPPES NPI Registry API, version 2.1, no key needed:
// https://npiregistry.cms.hhs.gov/api-page
const NPI_API_URL = "https://npiregistry.cms.hhs.gov/api/";
const TIMEOUT_MS = 8_000;
// The API returns at most 200 results per request.
const MAX_LIMIT = 200;

const optionalText = z.string().nullish();

const addressSchema = z.object({
  address_1: z.string().min(1),
  address_2: optionalText,
  address_purpose: optionalText,
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(5),
  telephone_number: optionalText,
});
type NpiAddress = z.infer<typeof addressSchema>;

const recordSchema = z.object({
  number: z.union([z.string(), z.number()]).transform(String),
  enumeration_type: z.enum(["NPI-1", "NPI-2"]),
  basic: z.object({
    organization_name: optionalText,
    first_name: optionalText,
    last_name: optionalText,
    credential: optionalText,
  }),
  addresses: z.array(addressSchema),
  practiceLocations: z.array(addressSchema).nullish(),
  taxonomies: z.array(z.object({ desc: optionalText, primary: z.boolean().nullish() })).nullish(),
});
type NpiRecord = z.infer<typeof recordSchema>;

const responseSchema = z.object({
  results: z.array(z.unknown()).optional(),
  Errors: z.array(z.object({ description: z.string() })).optional(),
});

async function fetchNpi(postalCode: string, taxonomy: string, limit: number): Promise<unknown[]> {
  const url = new URL(NPI_API_URL);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("postal_code", postalCode);
  url.searchParams.set("taxonomy_description", taxonomy);
  // Match primary and secondary practice locations, not mailing addresses.
  url.searchParams.set("address_purpose", "LOCATION");
  url.searchParams.set("limit", String(Math.min(Math.max(1, limit), MAX_LIMIT)));

  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`NPI Registry search failed with status ${response.status}`);
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("NPI Registry returned an unexpected response");
  if (parsed.data.Errors?.length) throw new Error("NPI Registry rejected the search");
  return parsed.data.results ?? [];
}

function providerName(record: NpiRecord): string | null {
  const { basic } = record;
  if (record.enumeration_type === "NPI-2") return basic.organization_name || null;
  const fullName = [basic.first_name, basic.last_name].filter(Boolean).join(" ");
  if (!fullName) return null;
  return basic.credential ? `${fullName}, ${basic.credential}` : fullName;
}

const formatPostalCode = (code: string) =>
  /^\d{9}$/.test(code) ? `${code.slice(0, 5)}-${code.slice(5)}` : code;

function formatAddress(address: NpiAddress): string {
  const street = [address.address_1, address.address_2].filter(Boolean).join(", ");
  return `${street}, ${address.city}, ${address.state} ${formatPostalCode(address.postal_code)}`;
}

// The taxonomy that matched the search, else the provider's primary one.
function specialty(record: NpiRecord, taxonomy: string): string | null {
  const taxonomies = record.taxonomies ?? [];
  const wanted = taxonomy.toLowerCase();
  const match =
    taxonomies.find((t) => t.desc?.toLowerCase().includes(wanted)) ??
    taxonomies.find((t) => t.primary) ??
    taxonomies[0];
  return match?.desc ?? null;
}

// Maps a record to a result at its practice location inside the searched area.
// Records that match only through another address are dropped, so a search
// near one ZIP never shows a provider's office in another city.
function toProviderResult(raw: unknown, zipPrefix: string, taxonomy: string): ProviderResult | null {
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) return null;
  const record = parsed.data;
  const practiceAddresses = [
    ...record.addresses.filter((address) => address.address_purpose === "LOCATION"),
    ...(record.practiceLocations ?? []),
  ];
  const address = practiceAddresses.find((a) => a.postal_code.startsWith(zipPrefix));
  const name = providerName(record);
  if (!address || !name) return null;
  return {
    source: "npi_registry",
    externalId: record.number,
    name,
    address: formatAddress(address),
    specialty: specialty(record, taxonomy),
    phone: address.telephone_number || null,
    website: null,
    rating: null,
    ratingCount: null,
    location: null,
    distanceMeters: null,
    mapsUrl: null,
    networkStatus: "not_verified",
  };
}

const mapRecords = (records: unknown[], zipPrefix: string, taxonomy: string) =>
  records.flatMap((raw) => toProviderResult(raw, zipPrefix, taxonomy) ?? []);

// Providers with a practice location in `zip`. When there are fewer than
// `limit`, the search widens to the 3-digit ZIP prefix (for example "787*"),
// using the trailing wildcard the API supports. Exact-ZIP results come first.
export async function searchNpi(input: {
  taxonomy: string;
  zip: string;
  limit: number;
}): Promise<ProviderResult[]> {
  const { taxonomy, zip, limit } = input;
  const exact = mapRecords(await fetchNpi(zip, taxonomy, limit), zip, taxonomy);
  if (exact.length >= limit) return exact.slice(0, limit);

  const prefix = zip.slice(0, 3);
  let nearbyRecords: unknown[] = [];
  try {
    nearbyRecords = await fetchNpi(`${prefix}*`, taxonomy, limit + exact.length);
  } catch (error) {
    if (exact.length === 0) throw error;
  }
  const seen = new Set(exact.map((provider) => provider.externalId));
  const nearby = mapRecords(nearbyRecords, prefix, taxonomy).filter(
    (provider) => !seen.has(provider.externalId),
  );
  return [...exact, ...nearby].slice(0, limit);
}
