import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeZip, searchPlaces } from "@/lib/providers/places";
import placesGeocode from "./fixtures/places-geocode.json";
import placesSearch from "./fixtures/places-search.json";
import { PLACES_URL, jsonResponse, mockFetch } from "./helpers";

const center = { lat: 30.2711, lng: -97.7437 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchPlaces", () => {
  it("sends a Text Search request with a field mask and a location bias", async () => {
    const fetchMock = mockFetch(() => jsonResponse(placesSearch));
    await searchPlaces({ query: "sports medicine clinic", center, apiKey: "test-key", limit: 5 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(PLACES_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "X-Goog-Api-Key": "test-key",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating," +
        "places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      textQuery: "sports medicine clinic",
      regionCode: "US",
      languageCode: "en",
      pageSize: 5,
      locationBias: {
        circle: { center: { latitude: 30.2711, longitude: -97.7437 }, radius: 16000 },
      },
    });
  });

  it("asks for at most 20 places, the API maximum", async () => {
    const fetchMock = mockFetch(() => jsonResponse(placesSearch));
    await searchPlaces({ query: "urgent care", center, apiKey: "test-key", limit: 50 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).pageSize).toBe(20);
  });

  it("maps places to results with their distance from the center", async () => {
    mockFetch(() => jsonResponse(placesSearch));
    const providers = await searchPlaces({ query: "sports medicine", center, apiKey: "k", limit: 5 });

    // The service-area business has no address, so it is skipped.
    expect(providers.map((p) => p.externalId)).toEqual(["test-place-far", "test-place-near"]);
    expect(providers[0]).toEqual({
      source: "google_places",
      externalId: "test-place-far",
      name: "Example Orthopedics North",
      address: "200 Example Blvd, Austin, TX 78758, USA",
      specialty: null,
      phone: "(512) 555-0100",
      website: "https://example.com/ortho-north",
      rating: 4.6,
      ratingCount: 312,
      location: { lat: 30.3889, lng: -97.7203 },
      distanceMeters: expect.any(Number),
      mapsUrl: "https://maps.google.com/?cid=1",
      networkStatus: "not_verified",
    });
    expect(providers[0].distanceMeters).toBeGreaterThan(13_000);
    // No rating in the response means no rating shown, never a default.
    expect(providers[1]).toMatchObject({ rating: null, ratingCount: null, phone: null, website: null });
    expect(providers[1].distanceMeters).toBeLessThan(200);
  });

  it("returns an empty list when nothing matches", async () => {
    mockFetch(() => jsonResponse({}));
    await expect(searchPlaces({ query: "x", center, apiKey: "k", limit: 5 })).resolves.toEqual([]);
  });

  it("throws on an error status without echoing the key", async () => {
    mockFetch(() => jsonResponse({ error: { code: 403, status: "PERMISSION_DENIED" } }, 403));
    const error = await searchPlaces({ query: "x", center, apiKey: "secret-key", limit: 5 }).catch(
      (thrown: unknown) => thrown,
    );
    expect(String(error)).toContain("Google Places search failed with status 403");
    expect(String(error)).not.toContain("secret-key");
  });

  it("throws on a response it does not recognize", async () => {
    mockFetch(() => jsonResponse({ places: "not a list" }));
    await expect(searchPlaces({ query: "x", center, apiKey: "k", limit: 5 })).rejects.toThrow(
      "unexpected response",
    );
  });
});

describe("geocodeZip", () => {
  it("returns the location of the ZIP code", async () => {
    const fetchMock = mockFetch(() => jsonResponse(placesGeocode));
    await expect(geocodeZip("78701", "test-key")).resolves.toEqual({ lat: 30.2711, lng: -97.7437 });

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>)["X-Goog-FieldMask"]).toBe(
      "places.formattedAddress,places.location",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({ textQuery: "78701", regionCode: "US", pageSize: 1 });
  });

  it("returns null when the top result is not that ZIP", async () => {
    mockFetch(() => jsonResponse(placesGeocode));
    await expect(geocodeZip("10001", "test-key")).resolves.toBeNull();
  });

  it("returns null when nothing is found", async () => {
    mockFetch(() => jsonResponse({}));
    await expect(geocodeZip("78701", "test-key")).resolves.toBeNull();
  });
});
