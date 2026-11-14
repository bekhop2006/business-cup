import { afterEach, describe, expect, it, vi } from "vitest";
import { searchNpi } from "@/lib/providers/npi";
import npiError from "./fixtures/npi-error.json";
import exactZip from "./fixtures/npi-exact-zip.json";
import zipPrefix from "./fixtures/npi-zip-prefix.json";
import { jsonResponse, mockFetch, requestUrls } from "./helpers";

const search = { taxonomy: "sports medicine", zip: "78701" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchNpi", () => {
  it("queries practice locations in the exact ZIP with the documented parameters", async () => {
    const fetchMock = mockFetch(() => jsonResponse(exactZip));
    await searchNpi({ ...search, limit: 2 });

    const url = new URL(requestUrls(fetchMock)[0]);
    expect(url.origin + url.pathname).toBe("https://npiregistry.cms.hhs.gov/api/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      version: "2.1",
      postal_code: "78701",
      taxonomy_description: "sports medicine",
      address_purpose: "LOCATION",
      limit: "2",
    });
  });

  it("maps individuals to their practice location inside the searched ZIP", async () => {
    mockFetch(() => jsonResponse(exactZip));
    const providers = await searchNpi({ ...search, limit: 2 });

    expect(providers).toHaveLength(2);
    // Primary location is in Houston; the matching Austin location is shown.
    expect(providers[0]).toEqual({
      source: "npi_registry",
      externalId: "1790123370",
      name: "ANGELA CORTEZ, M.D.",
      address: "1400 IH 35 N, SUITE 2.230, AUSTIN, TX 78701-1926",
      specialty: "Physical Medicine & Rehabilitation, Sports Medicine",
      phone: "512-324-8235",
      website: null,
      rating: null,
      ratingCount: null,
      location: null,
      distanceMeters: null,
      mapsUrl: null,
      networkStatus: "not_verified",
    });
    // The searched taxonomy is shown even when it is not the primary one.
    expect(providers[1]).toMatchObject({
      externalId: "1972553303",
      name: "SHEILA PATEL, DO",
      address: "823 CONGRESS AVE STE 150-518, AUSTIN, TX 78701-2405",
      specialty: "Physical Medicine & Rehabilitation, Sports Medicine",
    });
  });

  it("drops a provider whose practice locations are all outside the area", async () => {
    const onlyHouston = structuredClone(exactZip);
    onlyHouston.results[0].practiceLocations = [];
    mockFetch(() => jsonResponse(onlyHouston));

    const providers = await searchNpi({ ...search, limit: 2 });
    expect(providers.map((p) => p.externalId)).not.toContain("1790123370");
  });

  it("widens to the 3-digit ZIP prefix when the exact ZIP has too few", async () => {
    const fetchMock = mockFetch((url) =>
      jsonResponse(new URL(url).searchParams.get("postal_code") === "78701" ? exactZip : zipPrefix),
    );
    const providers = await searchNpi({ ...search, limit: 4 });

    const wideUrl = new URL(requestUrls(fetchMock)[1]);
    expect(wideUrl.searchParams.get("postal_code")).toBe("787*");
    expect(wideUrl.searchParams.get("address_purpose")).toBe("LOCATION");
    // Exact-ZIP results first, the duplicate from the wider search is dropped.
    expect(providers.map((p) => p.name)).toEqual([
      "ANGELA CORTEZ, M.D.",
      "SHEILA PATEL, DO",
      "AUSTIN SPORTS MEDICINE LLP",
      "MEDICINE IN MOTION, MARTHA PYRON MD",
    ]);
    expect(providers[2]).toMatchObject({
      address: "900 W 38TH ST, SUITE 300, AUSTIN, TX 78705-1130",
      phone: "512-450-1300",
      specialty: "Orthopaedic Surgery, Sports Medicine",
    });
  });

  it("keeps exact-ZIP results when the wider search fails", async () => {
    mockFetch((url) =>
      new URL(url).searchParams.get("postal_code") === "78701"
        ? jsonResponse(exactZip)
        : jsonResponse({ message: "unavailable" }, 503),
    );
    const providers = await searchNpi({ ...search, limit: 10 });
    expect(providers).toHaveLength(2);
  });

  it("throws when the registry rejects the search", async () => {
    mockFetch(() => jsonResponse(npiError));
    await expect(searchNpi({ ...search, limit: 5 })).rejects.toThrow("NPI Registry rejected the search");
  });

  it("throws when the registry is down", async () => {
    mockFetch(() => jsonResponse({}, 500));
    await expect(searchNpi({ ...search, limit: 5 })).rejects.toThrow("status 500");
  });
});
