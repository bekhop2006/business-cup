import { describe, expect, it } from "vitest";
import { providerDirections, providerPhoneHref, safeHttpUrl } from "@/lib/providers/links";

describe("provider links", () => {
  it("accepts only http(s) directory links", () => {
    expect(safeHttpUrl("https://example.com/clinic")).toBe("https://example.com/clinic");
    for (const value of [null, "", "javascript:alert(1)", "data:text/html,test", "/relative", "not a URL"]) {
      expect(safeHttpUrl(value)).toBeNull();
    }
  });

  it("builds telephone links without passing directory text into the protocol", () => {
    expect(providerPhoneHref("+1 (512) 555-0100")).toBe("tel:+15125550100");
    expect(providerPhoneHref("512-555-0100")).toBe("tel:5125550100");
    expect(providerPhoneHref("javascript:alert(1)")).toBeNull();
    expect(providerPhoneHref(null)).toBeNull();
  });

  it("encodes the actual practice address and an optional Google place id", () => {
    const address = "123 Example St, Suite A & B, Austin, TX 78701";
    const npi = new URL(providerDirections(address)!);
    expect(npi.origin).toBe("https://www.google.com");
    expect(npi.searchParams.get("destination")).toBe(address);
    expect(npi.searchParams.get("api")).toBe("1");
    expect(npi.searchParams.has("destination_place_id")).toBe(false);
    expect(new URL(providerDirections(address, "place-example")!).searchParams.get("destination_place_id")).toBe("place-example");
    expect(providerDirections(null)).toBeNull();
  });
});
