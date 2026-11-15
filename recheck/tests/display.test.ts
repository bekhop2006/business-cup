import { describe, expect, it } from "vitest";
import { formatServiceDate } from "@/lib/dates";
import { displayProviderName } from "@/lib/providers/links";

describe("displayProviderName", () => {
  it("turns registry capitals into title case, keeping credentials", () => {
    expect(displayProviderName("MICHAEL DAVIES")).toBe("Michael Davies");
    expect(displayProviderName("KARUNA LABS INC")).toBe("Karuna Labs Inc");
    expect(displayProviderName("JANE O'NEIL-SMITH MD")).toBe("Jane O'neil-Smith MD");
  });

  it("keeps names that already use mixed case", () => {
    expect(displayProviderName("UCSF Sports Medicine")).toBe("UCSF Sports Medicine");
  });
});

describe("formatServiceDate", () => {
  it("uses digits for Kazakh, where browsers lack month names", () => {
    expect(formatServiceDate("2026-11-20", "kk-KZ")).toBe("20.11.2026");
    expect(formatServiceDate("2026-11-20", "en-US")).toBe("Nov 20, 2026");
  });
});
