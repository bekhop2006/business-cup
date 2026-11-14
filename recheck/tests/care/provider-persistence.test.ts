import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db/types";
import { saveCaseChoice, saveCaseProviders, saveCaseProviderSearch, saveCaseSafety } from "@/lib/db/care";
import { makeSelectionEstimate } from "@/lib/care/selection";
import { chosenProviderSchema } from "@/lib/schemas/providers";
import { MICHAEL_PLAN } from "../costs/helpers";
import { careCase, CASE_ID, PROVIDER_ID, providerResult, providerRow, REVISION, routineContext, USER_ID } from "./provider-helpers";

type Reply = { body: unknown; status?: number };
type Request = { url: URL; method: string; body: Record<string, unknown> };

function database(replies: Reply[]) {
  const requests: Request[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: new URL(String(input)), method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected database request");
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } });
  });
  const db = createClient<Database>("https://example.test", "test-only-key", {
    global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { db, requests };
}

const noRow: Reply = { status: 406, body: { code: "PGRST116", message: "No matching row" } };

describe("provider persistence concurrency", () => {
  it("merges another route after a compare-and-swap conflict without overwriting it", async () => {
    const context = routineContext();
    const latest = routineContext();
    latest.revision = "00000000-0000-4000-8000-000000000005";
    latest.provider_searches!.primary_care = { ...latest.provider_searches!.sports_medicine!, zip: "78702" };
    const { db, requests } = database([
      { body: [] }, { body: [careCase(latest)] }, { body: { id: CASE_ID } },
    ]);
    const search = context.provider_searches!.sports_medicine!;
    await saveCaseProviderSearch(db, USER_ID, CASE_ID, context, "sports_medicine", search);
    expect(requests.map((request) => request.method)).toEqual(["PATCH", "GET", "PATCH"]);
    expect(requests[0].url.searchParams.get("warning_answers->>revision")).toBe(`eq.${REVISION}`);
    expect(requests[2].url.searchParams.get("warning_answers->>revision")).toBe(`eq.${latest.revision}`);
    expect(requests[2].body.warning_answers).toMatchObject({
      provider_searches: { primary_care: { zip: "78702" }, sports_medicine: search },
    });
  });

  it("does not retry a search write after safety changed to urgent", async () => {
    const context = routineContext();
    const warning = routineContext();
    warning.answers = { ...warning.answers, cannot_bear_weight: true };
    const { db, requests } = database([{ body: [] }, { body: [careCase(warning)] }]);
    await expect(saveCaseProviderSearch(db, USER_ID, CASE_ID, context, "sports_medicine", context.provider_searches!.sports_medicine!)).rejects.toThrow("changed");
    expect(requests).toHaveLength(2);
  });

  it("does not let an older safety form overwrite a new search or silently keep a choice", async () => {
    const { db, requests } = database([noRow]);
    await expect(saveCaseSafety(db, USER_ID, CASE_ID, routineContext(), "urgent")).rejects.toThrow("Could not save");
    expect(requests[0].url.searchParams.get("warning_answers->>revision")).toBe(`eq.${REVISION}`);
    expect(requests[0].body).toMatchObject({ urgency: "urgent", chosen_provider: null, estimate: null, estimated_savings_cents: null });
  });

  it("conditions choice on the exact checked search version, owner and safe case", async () => {
    const { db, requests } = database([noRow]);
    await expect(saveCaseChoice(db, USER_ID, CASE_ID, chosenProviderSchema.parse(providerRow), makeSelectionEstimate("sports_medicine", MICHAEL_PLAN), REVISION)).rejects.toThrow("Could not save");
    const query = requests[0].url.searchParams;
    expect(query.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(query.get("id")).toBe(`eq.${CASE_ID}`);
    expect(query.get("urgency")).toBe("eq.routine");
    expect(query.get("body_area")).toBe("eq.knee_leg");
    expect(query.get("warning_answers->>revision")).toBe(`eq.${REVISION}`);
  });

  it("updates legacy safety contexts only while they still have no revision", async () => {
    const context = routineContext();
    delete context.revision;
    const { db, requests } = database([{ body: { id: CASE_ID } }]);
    await saveCaseSafety(db, USER_ID, CASE_ID, context, "routine");
    expect(requests[0].url.searchParams.get("warning_answers->>revision")).toBe("is.null");
  });
});

describe("provider snapshots", () => {
  it("preserves directory order when the database returns upserted rows in another order", async () => {
    const secondId = "00000000-0000-4000-8000-000000000006";
    const { db } = database([{ body: [
      { id: secondId, source: "npi_registry", external_id: "second" },
      { id: PROVIDER_ID, source: "npi_registry", external_id: providerResult.externalId },
    ] }]);
    expect(await saveCaseProviders(db, USER_ID, CASE_ID, "sports_medicine", [providerResult, { ...providerResult, externalId: "second" }])).toEqual([PROVIDER_ID, secondId]);
  });
});
