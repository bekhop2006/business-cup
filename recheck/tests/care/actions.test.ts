import { beforeEach, describe, expect, it, vi } from "vitest";
import { startCareCase, saveSafetyAnswers } from "@/app/(app)/care/actions";
import { getCurrentUser } from "@/lib/db/auth";
import { createCareCase, getCareCase, saveCaseSafety } from "@/lib/db/care";
import { intakeCareCase } from "@/lib/llm/intake";
import { SAFETY_QUESTIONS } from "@/lib/care/safety";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db/supabase", () => ({ createServerSupabase: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/care", () => ({ createCareCase: vi.fn(), getCareCase: vi.fn(), saveCaseSafety: vi.fn() }));
vi.mock("@/lib/llm/intake", () => ({ intakeCareCase: vi.fn() }));

const caseId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: userId } as Awaited<ReturnType<typeof getCurrentUser>>);
  vi.mocked(createCareCase).mockResolvedValue(caseId);
  vi.mocked(getCareCase).mockResolvedValue({
    id: caseId, user_id: userId, created_at: "2026-11-15T00:00:00Z",
    description: "My knee hurts after tennis", summary: null, body_area: null,
    warning_answers: { intake: null }, urgency: null, route: null,
    chosen_provider: null, estimate: null, estimated_savings_cents: null,
  });
});

function safetyForm(): FormData {
  const form = new FormData();
  form.set("caseId", caseId);
  form.set("scope", "knee_leg");
  for (const question of SAFETY_QUESTIONS) form.set(question.id, "no");
  return form;
}

describe("startCareCase", () => {
  it("requires authentication before storing or sending any health text", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(startCareCase({}, new FormData())).rejects.toThrow("redirect:/login");
    expect(intakeCareCase).not.toHaveBeenCalled();
    expect(createCareCase).not.toHaveBeenCalled();
  });

  it("validates the description before calling the model", async () => {
    const form = new FormData();
    form.set("description", "short");
    expect((await startCareCase({}, form)).error).toBeTruthy();
    expect(intakeCareCase).not.toHaveBeenCalled();
  });

  it("keeps safety accessible if the model is unavailable", async () => {
    vi.mocked(intakeCareCase).mockRejectedValue(new Error("unavailable"));
    const form = new FormData();
    form.set("description", "My knee hurts after tennis");
    await expect(startCareCase({}, form)).rejects.toThrow(`redirect:/care/${caseId}`);
    expect(createCareCase).toHaveBeenCalledWith({}, userId, "My knee hurts after tennis", { intake: null });
  });

  it("returns a readable error if saving fails", async () => {
    vi.mocked(intakeCareCase).mockResolvedValue(null);
    vi.mocked(createCareCase).mockRejectedValue(new Error("db"));
    const form = new FormData();
    form.set("description", "My knee hurts after tennis");
    const result = await startCareCase({}, form);
    expect(result.error).toContain("couldn't save");
    expect(result.description).toBe("My knee hurts after tennis");
  });

  it("can skip the model and go directly to safety", async () => {
    const form = new FormData();
    form.set("description", "My knee hurts after tennis");
    form.set("skipSummary", "1");
    await expect(startCareCase({}, form)).rejects.toThrow(`redirect:/care/${caseId}`);
    expect(intakeCareCase).not.toHaveBeenCalled();
    expect(createCareCase).toHaveBeenCalledWith({}, userId, "My knee hurts after tennis", { intake: null });
  });
});

describe("saveSafetyAnswers", () => {
  it("computes urgency from confirmed answers and scopes access to the owner", async () => {
    const form = safetyForm();
    form.set("cannot_bear_weight", "yes");
    // A client-provided urgency must never override the deterministic check.
    form.set("urgency", "routine");
    await expect(saveSafetyAnswers({}, form)).rejects.toThrow(`redirect:/care/${caseId}`);
    expect(getCareCase).toHaveBeenCalledWith({}, userId, caseId);
    expect(saveCaseSafety).toHaveBeenCalledWith({}, userId, caseId,
      expect.objectContaining({ scope: "knee_leg", answers: expect.objectContaining({ cannot_bear_weight: true }) }), "urgent");
  });

  it("does not allow unanswered questions to become routine", async () => {
    const form = safetyForm();
    form.delete("chest_pain_or_breathless");
    await expect(saveSafetyAnswers({}, form)).rejects.toThrow("redirect:");
    expect(vi.mocked(saveCaseSafety).mock.calls[0][4]).toBe("urgent");
  });

  it("does not update a case the current user cannot read", async () => {
    vi.mocked(getCareCase).mockResolvedValue(null);
    expect((await saveSafetyAnswers({}, safetyForm())).error).toContain("wasn't found");
    expect(saveCaseSafety).not.toHaveBeenCalled();
  });

  it("rejects malformed ids and answer values", async () => {
    const form = safetyForm();
    form.set("caseId", "invalid");
    expect((await saveSafetyAnswers({}, form)).error).toBeTruthy();
    form.set("caseId", caseId);
    form.set("severe_pain", "false");
    expect((await saveSafetyAnswers({}, form)).error).toBeTruthy();
    expect(saveCaseSafety).not.toHaveBeenCalled();
  });
});
