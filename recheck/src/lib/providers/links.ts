export function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function providerPhoneHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${phone.trim().startsWith("+") ? "+" : ""}${digits}`;
}

export function providerDirections(address: string | null, placeId?: string): string | null {
  if (!address) return null;
  // Address-based Maps URLs also work for NPI entries without coordinates:
  // https://developers.google.com/maps/documentation/urls/get-started
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", address);
  if (placeId) url.searchParams.set("destination_place_id", placeId);
  return url.href;
}
