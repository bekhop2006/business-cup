import { afterEach, describe, expect, it, vi } from "vitest";
import { addDistances, geocodeAddress, zipCenter } from "@/lib/providers/geocode";
import type { ProviderResult } from "@/lib/providers";
import { jsonResponse, mockFetch, requestUrls } from "./helpers";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

const provider = (overrides: Partial<ProviderResult>): ProviderResult => ({
  source: "npi_registry",
  externalId: "1",
  name: "MICHAEL DAVIES",
  address: "1001 POTRERO AVE, SAN FRANCISCO, CA 94110-3518",
  specialty: "Sports Medicine",
  phone: null,
  website: null,
  rating: null,
  ratingCount: null,
  location: null,
  distanceMeters: null,
  mapsUrl: null,
  networkStatus: "not_verified",
  ...overrides,
});

const census = (x: number, y: number) => jsonResponse({ result: { addressMatches: [{ coordinates: { x, y } }] } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("zipCenter", () => {
  it("reads the ZIP center from OpenStreetMap and identifies the app", async () => {
    const fetchMock = mockFetch(() => jsonResponse([{ lat: "37.7535", lon: "-122.4170" }]));
    await expect(zipCenter("94110")).resolves.toEqual({ lat: 37.7535, lng: -122.417 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("postalcode=94110");
    expect((init?.headers as Record<string, string>)["User-Agent"]).toContain("Recheck");
  });

  it("returns null when the ZIP is unknown or the service fails", async () => {
    mockFetch(() => jsonResponse([]));
    await expect(zipCenter("00000")).resolves.toBeNull();
    mockFetch(() => jsonResponse({}, 503));
    await expect(zipCenter("94110")).resolves.toBeNull();
    mockFetch(() => { throw new Error("offline"); });
    await expect(zipCenter("94110")).resolves.toBeNull();
  });
});

describe("geocodeAddress", () => {
  it("reads the first Census match", async () => {
    mockFetch(() => census(-122.4066, 37.7561));
    await expect(geocodeAddress("1001 Potrero Ave, San Francisco, CA 94110")).resolves.toEqual({ lat: 37.7561, lng: -122.4066 });
  });

  it("returns null with no match", async () => {
    mockFetch(() => jsonResponse({ result: { addressMatches: [] } }));
    await expect(geocodeAddress("nowhere")).resolves.toBeNull();
  });
});

describe("addDistances", () => {
  it("adds a straight-line distance from the ZIP center to each found address", async () => {
    mockFetch((url) => {
      if (url.startsWith(NOMINATIM)) return jsonResponse([{ lat: "37.7535", lon: "-122.4170" }]);
      if (url.includes("POTRERO")) return census(-122.4066, 37.7561);
      return jsonResponse({ result: { addressMatches: [] } });
    });
    const [found, missing] = await addDistances(
      [provider({}), provider({ externalId: "2", address: "UNKNOWN PLACE" })],
      "94110",
    );
    expect(found.distanceMeters).toBeGreaterThan(900);
    expect(found.distanceMeters).toBeLessThan(1000);
    expect(found.location).toEqual({ lat: 37.7561, lng: -122.4066 });
    expect(missing.distanceMeters).toBeNull();
  });

  it("leaves providers as they are when the ZIP center can't be found", async () => {
    const fetchMock = mockFetch(() => jsonResponse([]));
    const providers = [provider({})];
    await expect(addDistances(providers, "94110")).resolves.toEqual(providers);
    expect(requestUrls(fetchMock).some((url) => url.startsWith(CENSUS))).toBe(false);
  });

  it("makes no requests when every provider already has a distance", async () => {
    const fetchMock = mockFetch(() => jsonResponse([]));
    await addDistances([provider({ distanceMeters: 120 })], "94110");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
