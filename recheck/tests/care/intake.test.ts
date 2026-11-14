import { beforeEach, describe, expect, it, vi } from "vitest";
import { intakeSchema, readCaseContext } from "@/lib/schemas/intake";
import { intakeCareCase } from "@/lib/llm/intake";
import { writeStructured } from "@/lib/llm/client";

vi.mock("@/lib/llm/client", () => ({ writeStructured: vi.fn() }));

const intake = {
  summary: "Knee pain for a week after tennis.",
  body_area: "knee_leg",
  duration_text: "a week",
  suggested_routes: ["primary_care", "sports_medicine"],
  mentioned_warning_signs: [],
};

beforeEach(() => vi.resetAllMocks());

describe("care intake", () => {
  it("accepts known route and warning ids and rejects invented ones", () => {
    expect(intakeSchema.safeParse(intake).success).toBe(true);
    expect(intakeSchema.safeParse({ ...intake, suggested_routes: ["surgery"] }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...intake, mentioned_warning_signs: ["diagnosis"] }).success).toBe(false);
  });

  it("keeps extracted warning signs separate from confirmed safety answers", () => {
    const context = readCaseContext({ intake: { ...intake, mentioned_warning_signs: ["cannot_bear_weight"] } });
    expect(context.intake?.mentioned_warning_signs).toEqual(["cannot_bear_weight"]);
    expect(context.answers).toBeUndefined();
  });

  it("discards invalid saved context instead of trusting string safety answers", () => {
    expect(readCaseContext({ intake, answers: { chest_pain_or_breathless: "no" } })).toEqual({ intake: null });
    expect(readCaseContext(null)).toEqual({ intake: null });
  });

  it("retries an invalid structured response once", async () => {
    vi.mocked(writeStructured).mockResolvedValueOnce(null).mockResolvedValueOnce(intake);
    expect(await intakeCareCase("My knee hurts after tennis")).toEqual(intake);
    expect(writeStructured).toHaveBeenCalledTimes(2);
    expect(vi.mocked(writeStructured).mock.calls[0][0].request).toBe(JSON.stringify({ description: "My knee hurts after tennis" }));
  });

  it("returns null after two invalid responses", async () => {
    vi.mocked(writeStructured).mockResolvedValue(null);
    expect(await intakeCareCase("My knee hurts after tennis")).toBeNull();
    expect(writeStructured).toHaveBeenCalledTimes(2);
  });
});
