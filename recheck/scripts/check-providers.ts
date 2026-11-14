// Live smoke check of provider search: sports medicine near ZIP 78701 (Austin, TX).
// Usage: npx tsx scripts/check-providers.ts
// The NPI Registry needs no key. Google Places runs only when
// GOOGLE_PLACES_API_KEY is set in .env.local or the environment.

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const ZIP = "78701";

function printProviders(label: string, providers: { name: string; address: string }[]) {
  console.log(`${label}: ${providers.length} providers`);
  for (const provider of providers.slice(0, 5)) {
    console.log(`  - ${provider.name} (${provider.address})`);
  }
}

async function main() {
  const { searchNpi } = await import("@/lib/providers/npi");
  const { findProviders } = await import("@/lib/providers");
  let failed = false;

  const npi = await searchNpi({ taxonomy: "sports medicine", zip: ZIP, limit: 10 });
  printProviders("NPI Registry", npi);
  if (npi.length === 0) failed = true;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    const result = await findProviders({
      placesQuery: "sports medicine clinic",
      npiTaxonomy: "sports medicine",
      zip: ZIP,
      placesApiKey: apiKey,
      limit: 10,
    });
    printProviders(`findProviders (source: ${result.source}, error: ${result.error ?? "none"})`, result.providers);
    if (result.source !== "google_places") failed = true;
  } else {
    console.log("Google Places: skipped, GOOGLE_PLACES_API_KEY is not set");
  }

  process.exitCode = failed ? 1 : 0;
}

main();
