import { vi } from "vitest";

export const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
export const NPI_URL = "https://npiregistry.cms.hhs.gov/api/";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

// Replaces the global fetch with a mock that records calls.
export function mockFetch(handler: FetchHandler) {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => handler(String(url), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export const requestUrls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.map(([url]) => String(url));

export const fieldMask = (init?: RequestInit) =>
  (init?.headers as Record<string, string> | undefined)?.["X-Goog-FieldMask"] ?? "";
