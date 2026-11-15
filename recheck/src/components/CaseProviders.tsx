import type { ComparisonRouteId } from "@/lib/care/routes";
import { CARE_ROUTES } from "@/lib/care/routes";
import type { CaseProvider } from "@/lib/db/care";
import { chosenProviderSchema, type ProviderSearch } from "@/lib/schemas/providers";
import { ChooseProviderForm } from "@/components/ChooseProviderForm";
import { ProviderDetails } from "@/components/ProviderDetails";
import { ProviderSearchForm } from "@/components/ProviderSearchForm";

export function CaseProviders({ caseId, route, zip, search, providers, chosenId }: {
  caseId: string;
  route: ComparisonRouteId;
  zip: string;
  search?: ProviderSearch;
  providers: CaseProvider[];
  chosenId?: string;
}) {
  return (
    <section id="providers" className="mt-8 scroll-mt-6 rounded-xl border border-[var(--rc-navy)]/20 p-5">
      <h2 className="text-xl font-medium">Providers for {CARE_ROUTES[route].label.toLowerCase()}</h2>
      <p className="mt-2 text-sm text-[var(--rc-muted)]">Directory listings are not a recommendation or a quote. Confirm availability, location and coverage before booking.</p>
      <ProviderSearchForm key={`${route}-${search?.zip ?? zip}`} caseId={caseId} route={route} zip={search?.zip ?? zip} />
      {search && <p className="mt-4 text-xs text-[var(--rc-muted)]">Last search: ZIP {search.zip}, {new Date(search.searched_at).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC.</p>}
      {search?.source === "npi_registry" && <p className="mt-2 text-xs leading-relaxed text-[var(--rc-muted)]">Source: CMS NPI Registry. Results may include the wider ZIP area. The registry has no ratings or websites. Distances are straight lines from the ZIP center (© OpenStreetMap contributors) to the address as located by the US Census Bureau geocoder. Confirm the current practice address and specialty.</p>}
      {search?.status === "unavailable" && <p role="status" className="mt-4 rounded-lg bg-[var(--rc-navy)]/4 p-4 text-sm">Search unavailable. We couldn&apos;t reach a provider directory. Try again, or use your insurer&apos;s provider directory.</p>}
      {search?.status === "empty" && <p role="status" className="mt-4 rounded-lg bg-[var(--rc-navy)]/4 p-4 text-sm">No providers found for this care option in that ZIP area. Try another ZIP or check your insurer&apos;s directory.</p>}
      {search?.status === "found" && providers.length === 0 && <p role="status" className="mt-4 text-sm">Saved search results are unavailable. Search again to refresh them.</p>}
      {search?.status === "found" && <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {providers.map((row) => {
          const result = chosenProviderSchema.safeParse(row);
          if (!result.success) return null;
          return <li key={row.id} className="min-w-0 rounded-lg border border-[var(--rc-navy)]/15 p-4">
            <ProviderDetails provider={result.data} />
            {row.id === chosenId ? <p className="mt-4 text-sm font-medium">Your saved choice</p> : <ChooseProviderForm caseId={caseId} route={route} providerId={row.id} />}
          </li>;
        })}
      </ul>}
    </section>
  );
}
