import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findProviders } from "@/lib/providers";
import exactZip from "./fixtures/npi-exact-zip.json";
import placesGeocode from "./fixtures/places-geocode.json";
import placesSearch from "./fixtures/places-search.json";
import { NPI_URL, PLACES_URL, fieldMask, jsonResponse, mockFetch, requestUrls } from "./helpers";

const input = {
  placesQuery: "sports medicine clinic",
  npiTaxonomy: "sports medicine",
  zip: "78701",
  limit: 2,
};

// Answers Places geocode and search requests, and NPI requests, each with
// the given response.
function routeFetch(responses: { geocode?: Response; places?: Response; npi?: Response }) {
  return mockFetch((url, init) => {
    if (url.startsWith(NPI_URL)) return responses.npi ?? jsonResponse(exactZip);
    if (url === PLACES_URL && fieldMask(init).includes("places.id")) {
      return responses.places ?? jsonResponse(placesSearch);
    }
    if (url === PLACES_URL) return responses.geocode ?? jsonResponse(placesGeocode);
    throw new Error(`Unexpected request to ${url}`);
  });
}

const npiCalled = (fetchMock: ReturnType<typeof mockFetch>) =>
  requestUrls(fetchMock).some((url) => url.startsWith(NPI_URL));
const placesCalled = (fetchMock: ReturnType<typeof mockFetch>) =>
  requestUrls(fetchMock).includes(PLACES_URL);

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("findProviders", () => {
  it("uses Google Places when a key is given and sorts by distance", async () => {
    const fetchMock = routeFetch({});
    const result = await findProviders({ ...input, placesApiKey: "test-key" });

    expect(result.source).toBe("google_places");
    expect(result.error).toBeUndefined();
    expect(result.providers.map((p) => p.externalId)).toEqual(["test-place-near", "test-place-far"]);
    expect(npiCalled(fetchMock)).toBe(false);
  });

  it("uses the NPI Registry when there is no key", async () => {
    const fetchMock = routeFetch({});
    const result = await findProviders(input);

    expect(result.source).toBe("npi_registry");
    expect(result.providers.map((p) => p.externalId)).toEqual(["1790123370", "1972553303"]);
    expect(result.providers.every((p) => p.networkStatus === "not_verified")).toBe(true);
    expect(placesCalled(fetchMock)).toBe(false);
  });

  it("falls back to the NPI Registry when Places fails", async () => {
    routeFetch({ places: jsonResponse({ error: { code: 500 } }, 500) });
    const result = await findProviders({ ...input, placesApiKey: "test-key" });

    expect(result.source).toBe("npi_registry");
    expect(result.providers).toHaveLength(2);
    expect(consoleError).toHaveBeenCalledWith("Provider search failed", {
      source: "google_places",
      reason: "Google Places search failed with status 500",
    });
  });

  it("falls back to the NPI Registry when Places times out", async () => {
    routeFetch({});
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const result = await findProviders({ ...input, placesApiKey: "test-key" });
    expect(result.source).toBe("npi_registry");
  });

  it("falls back to the NPI Registry when the ZIP cannot be located", async () => {
    routeFetch({ geocode: jsonResponse({}) });
    const result = await findProviders({ ...input, placesApiKey: "test-key" });
    expect(result.source).toBe("npi_registry");
  });

  it("falls back to the NPI Registry when Places finds nothing", async () => {
    routeFetch({ places: jsonResponse({}) });
    const result = await findProviders({ ...input, placesApiKey: "test-key" });
    expect(result.source).toBe("npi_registry");
    expect(result.providers).toHaveLength(2);
  });

  it("returns an empty list, never made-up providers, when both sources fail", async () => {
    routeFetch({
      places: jsonResponse({}, 503),
      npi: jsonResponse({}, 503),
    });
    const result = await findProviders({ ...input, placesApiKey: "test-key" });

    expect(result).toEqual({ providers: [], source: null, error: "unavailable" });
  });

  it("never logs the ZIP code or the search text", async () => {
    routeFetch({ places: jsonResponse({}, 503), npi: jsonResponse({}, 503) });
    await findProviders({ ...input, placesApiKey: "test-key" });

    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).not.toContain("78701");
    expect(logged).not.toContain("sports medicine");
    expect(logged).not.toContain("test-key");
  });

  it("rejects a ZIP that is not five digits without calling any API", async () => {
    const fetchMock = routeFetch({});
    const result = await findProviders({ ...input, zip: "787" });

    expect(result).toEqual({ providers: [], source: null, error: "invalid_zip" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
