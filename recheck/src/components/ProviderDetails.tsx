import { providerDirections, providerPhoneHref, safeHttpUrl } from "@/lib/providers/links";
import type { ChosenProvider } from "@/lib/schemas/providers";

export function ProviderDetails({ provider }: { provider: ChosenProvider }) {
  const website = safeHttpUrl(provider.website);
  const phone = providerPhoneHref(provider.phone);
  const directions = providerDirections(provider.address, provider.source === "google_places" ? provider.external_id : undefined);
  const map = safeHttpUrl(provider.maps_url);
  return (
    <>
      <h3 className="break-words text-lg font-semibold">{provider.name}</h3>
      <p className="mt-2 break-words text-sm">{provider.address ?? "Address not listed"}</p>
      <p className="mt-2 text-xs text-[var(--rc-muted)]">
        {provider.distance_meters !== null ? `${(provider.distance_meters / 1609.344).toFixed(1)} miles from ZIP center (straight line)` : "Distance not available"}
        {" · "}{provider.rating !== null ? `${provider.rating.toFixed(1)} / 5${provider.rating_count !== null ? ` (${provider.rating_count} reviews)` : ""}` : "Rating not available"}
      </p>
      <p className="mt-3 inline-block rounded-full bg-[var(--rc-navy)]/6 px-3 py-1 text-xs font-medium">Insurance: not verified</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {phone ? <a href={phone} className="min-h-11 py-3 underline underline-offset-4">{provider.phone}</a> : <span className="py-3 text-[var(--rc-muted)]">Phone not listed</span>}
        {website ? <a href={website} target="_blank" rel="noreferrer" className="min-h-11 py-3 underline underline-offset-4">Website</a> : <span className="py-3 text-[var(--rc-muted)]">Website not listed</span>}
        {directions && <a href={directions} target="_blank" rel="noreferrer" className="min-h-11 py-3 underline underline-offset-4">Directions</a>}
        {map && <a href={map} target="_blank" rel="noreferrer" className="min-h-11 py-3 underline underline-offset-4">Google Maps</a>}
      </div>
      <p className="mt-1 text-xs text-[var(--rc-muted)]">Source: {provider.source === "google_places" ? "Google Places" : "CMS NPI Registry"}</p>
    </>
  );
}
