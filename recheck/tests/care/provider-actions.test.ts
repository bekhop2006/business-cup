import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseCaseProvider, searchCaseProviders } from "@/app/(app)/care/provider-actions";
import { getCurrentUser } from "@/lib/db/auth";
import { getCareCase, getCaseProvider, saveCaseChoice, saveCaseProviders, saveCaseProviderSearch } from "@/lib/db/care";
import { getInsurancePlan } from "@/lib/db/profiles";
import { findProviders } from "@/lib/providers";
import { careCase, CASE_ID, PROVIDER_ID, providerResult, providerRow, REVISION, routineContext, USER_ID } from "./provider-helpers";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db/supabase", () => ({ createServerSupabase: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/care", () => ({
  getCareCase: vi.fn(), getCaseProvider: vi.fn(), saveCaseChoice: vi.fn(),
  saveCaseProviders: vi.fn(), saveCaseProviderSearch: vi.fn(),
}));
vi.mock("@/lib/db/profiles", () => ({ getInsurancePlan: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { GOOGLE_PLACES_API_KEY: undefined } }));
vi.mock("@/lib/providers", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/providers")>(), findProviders: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: USER_ID, email: null });
  vi.mocked(getCareCase).mockResolvedValue(careCase());
  vi.mocked(getCaseProvider).mockResolvedValue(providerRow);
  vi.mocked(saveCaseProviders).mockResolvedValue([PROVIDER_ID]);
  vi.mocked(findProviders).mockResolvedValue({ providers: [providerResult], source: "npi_registry" });
  vi.mocked(getInsurancePlan).mockResolvedValue({
    insurer_name: "UnitedHealthcare", plan_name: "Choice Plus", plan_type: "PPO",
    deductible_cents: 150000, deductible_met_cents: 30000,
    oop_max_cents: 600000, oop_met_cents: 30000, coinsurance_bps: 2000,
    copay_primary_cents: 2500, copay_specialist_cents: 5000,
    copay_urgent_care_cents: 7500, copay_er_cents: 25000, updated_at: "2026-11-15T00:00:00Z",
  });
});

function form(): FormData {
  const data = new FormData();
  data.set("caseId", CASE_ID);
  data.set("route", "sports_medicine");
  data.set("zip", "78701");
  data.set("providerId", PROVIDER_ID);
  return data;
}

describe("provider action access", () => {
  it.each([searchCaseProviders, chooseCaseProvider])("requires a session", async (action) => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(action({}, form())).rejects.toThrow("redirect:/login");
    expect(findProviders).not.toHaveBeenCalled();
    expect(saveCaseChoice).not.toHaveBeenCalled();
  });

  it.each([searchCaseProviders, chooseCaseProvider])("does not operate on a case outside the current user's view", async (action) => {
    vi.mocked(getCareCase).mockResolvedValue(null);
    expect((await action({}, form())).error).toContain("wasn't found");
    expect(getCareCase).toHaveBeenCalledWith({}, USER_ID, CASE_ID);
    expect(findProviders).not.toHaveBeenCalled();
    expect(saveCaseChoice).not.toHaveBeenCalled();
  });

  it.each([searchCaseProviders, chooseCaseProvider])("uses confirmed answers even when a stored urgency says routine", async (action) => {
    const context = routineContext();
    context.answers = { ...context.answers, cannot_bear_weight: true };
    vi.mocked(getCareCase).mockResolvedValue(careCase(context));
    expect((await action({}, form())).error).toContain("safety");
    expect(findProviders).not.toHaveBeenCalled();
    expect(saveCaseChoice).not.toHaveBeenCalled();
  });

  it("rejects emergency-room comparison and invalid ZIPs", async () => {
    const data = form();
    data.set("route", "emergency_room");
    expect((await searchCaseProviders({}, data)).error).toBeTruthy();
    data.set("route", "sports_medicine");
    data.set("zip", "787");
    expect((await searchCaseProviders({}, data)).error).toBeTruthy();
    expect(findProviders).not.toHaveBeenCalled();
  });
});

describe("searchCaseProviders", () => {
  it("sends only ZIP and the fixed care query to the directory, then saves the source and result ids", async () => {
    await expect(searchCaseProviders({}, form())).rejects.toThrow(`redirect:/care/${CASE_ID}?route=sports_medicine#providers`);
    expect(findProviders).toHaveBeenCalledWith({ zip: "78701", placesQuery: "sports medicine doctor", npiTaxonomy: "Sports Medicine", placesApiKey: undefined, limit: 10 });
    expect(saveCaseProviderSearch).toHaveBeenCalledWith({}, USER_ID, CASE_ID, expect.any(Object), "sports_medicine",
      expect.objectContaining({ zip: "78701", source: "npi_registry", status: "found", provider_ids: [PROVIDER_ID] }));
  });

  it("rechecks safety after the external request", async () => {
    const context = routineContext();
    context.answers = { ...context.answers, chest_pain_or_breathless: true };
    vi.mocked(getCareCase).mockResolvedValueOnce(careCase()).mockResolvedValueOnce(careCase(context));
    expect((await searchCaseProviders({}, form())).error).toContain("safety");
    expect(saveCaseProviders).not.toHaveBeenCalled();
    expect(saveCaseProviderSearch).not.toHaveBeenCalled();
  });

  it.each(["empty", "unavailable"] as const)("saves an honest %s result with no substitute providers", async (status) => {
    vi.mocked(findProviders).mockResolvedValue(status === "empty"
      ? { providers: [], source: "npi_registry" }
      : { providers: [], source: null, error: "unavailable" });
    vi.mocked(saveCaseProviders).mockResolvedValue([]);
    await expect(searchCaseProviders({}, form())).rejects.toThrow("redirect:");
    expect(saveCaseProviderSearch).toHaveBeenCalledWith({}, USER_ID, CASE_ID, expect.any(Object), "sports_medicine",
      expect.objectContaining({ status, provider_ids: [] }));
  });

  it("returns a retryable error if persistence fails", async () => {
    vi.mocked(saveCaseProviderSearch).mockRejectedValue(new Error("db"));
    expect((await searchCaseProviders({}, form())).error).toContain("try again");
  });
});

describe("chooseCaseProvider", () => {
  it("loads the provider by owner, case and route, and ignores injected prices or provider details", async () => {
    const data = form();
    data.set("name", "Fake clinic");
    data.set("estimated_savings_cents", "999999");
    await expect(chooseCaseProvider({}, data)).rejects.toThrow(`redirect:/care/${CASE_ID}?route=sports_medicine#your-choice`);
    expect(getCaseProvider).toHaveBeenCalledWith({}, USER_ID, CASE_ID, "sports_medicine", PROVIDER_ID);
    expect(saveCaseChoice).toHaveBeenCalledWith({}, USER_ID, CASE_ID,
      expect.objectContaining({ name: providerRow.name, source: "npi_registry", network_status: "not_verified" }),
      expect.objectContaining({ route: "sports_medicine", comparison: expect.objectContaining({ estimated_savings_cents: 2500 }) }), REVISION);
  });

  it("does not allow selection from an old search or another case", async () => {
    const context = routineContext();
    context.provider_searches!.sports_medicine!.provider_ids = [];
    vi.mocked(getCareCase).mockResolvedValue(careCase(context));
    expect((await chooseCaseProvider({}, form())).error).toContain("latest results");
    expect(getCaseProvider).not.toHaveBeenCalled();
    expect(saveCaseChoice).not.toHaveBeenCalled();
  });

  it("does not save a removed provider", async () => {
    vi.mocked(getCaseProvider).mockResolvedValue(null);
    expect((await chooseCaseProvider({}, form())).error).toContain("wasn't found");
    expect(saveCaseChoice).not.toHaveBeenCalled();
  });

  it("handles a version conflict while saving", async () => {
    vi.mocked(saveCaseChoice).mockRejectedValue(new Error("case changed"));
    expect((await chooseCaseProvider({}, form())).error).toContain("Review your safety answers");
  });
});
