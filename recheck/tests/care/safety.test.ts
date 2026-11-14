import { describe, expect, it } from "vitest";
import {
  assessUrgency,
  SAFETY_QUESTIONS,
  safetyQuestionsFor,
  UNANSWERED_REASON,
  type SafetyAnswers,
  type SafetyQuestionId,
} from "@/lib/care/safety";

function allNo(afterInjury = true): SafetyAnswers {
  return Object.fromEntries(safetyQuestionsFor(afterInjury).map((q) => [q.id, false]));
}

describe("SAFETY_QUESTIONS", () => {
  it("has unique ids and a source for every question", () => {
    const ids = SAFETY_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of SAFETY_QUESTIONS) expect(q.sourceUrl).toMatch(/^https:\/\//);
  });

  it("never names a diagnosis", () => {
    const text = SAFETY_QUESTIONS.flatMap((q) => [q.question, q.sign]).join(" ").toLowerCase();
    for (const word of ["fracture", "broken", "infection", "dislocat", "clot", "dvt", "torn", "tear", "sprain"]) {
      expect(text).not.toContain(word);
    }
  });

  it("skips injury-only questions when there was no injury", () => {
    const withoutInjury = safetyQuestionsFor(false).map((q) => q.id);
    expect(withoutInjury).not.toContain("deformity");
    expect(withoutInjury).not.toContain("rapid_swelling");
    expect(withoutInjury).toContain("chest_pain_or_breathless");
    expect(safetyQuestionsFor(true)).toHaveLength(SAFETY_QUESTIONS.length);
  });
});

describe("assessUrgency", () => {
  it("is routine when every question is answered no (Michael, a week after tennis)", () => {
    expect(assessUrgency(allNo())).toEqual({ urgency: "routine", reasons: [], flagged: [], unanswered: [] });
  });

  it("is routine without the injury-only questions when there was no injury", () => {
    expect(assessUrgency(allNo(false), { afterInjury: false }).urgency).toBe("routine");
  });

  it.each<SafetyQuestionId>(["chest_pain_or_breathless", "numb_cold_or_blue", "deformity", "rapid_swelling"])(
    "sends %s to the emergency level",
    (id) => {
      const result = assessUrgency({ ...allNo(), [id]: true });
      expect(result.urgency).toBe("emergency");
      expect(result.flagged).toEqual([id]);
      expect(result.reasons).toHaveLength(1);
    },
  );

  it.each<SafetyQuestionId>(["cannot_bear_weight", "hot_red_with_fever", "severe_pain", "locks_or_gives_way"])(
    "sends %s to the urgent level",
    (id) => {
      const result = assessUrgency({ ...allNo(), [id]: true });
      expect(result.urgency).toBe("urgent");
      expect(result.flagged).toEqual([id]);
    },
  );

  it("lets an emergency sign win and lists emergency reasons first", () => {
    const result = assessUrgency({ ...allNo(), severe_pain: true, chest_pain_or_breathless: true });
    expect(result.urgency).toBe("emergency");
    expect(result.flagged).toEqual(["chest_pain_or_breathless", "severe_pain"]);
    expect(result.reasons[0]).toContain("chest pain");
  });

  it("never returns routine while a question is unanswered", () => {
    const answers = allNo();
    delete answers.cannot_bear_weight;
    const result = assessUrgency(answers);
    expect(result.urgency).toBe("urgent");
    expect(result.unanswered).toEqual(["cannot_bear_weight"]);
    expect(result.reasons).toEqual([UNANSWERED_REASON]);
    expect(assessUrgency({}).urgency).toBe("urgent");
  });

  it("counts every question when it isn't known whether there was an injury", () => {
    const result = assessUrgency(allNo(false));
    expect(result.urgency).toBe("urgent");
    expect(result.unanswered).toEqual(["deformity", "rapid_swelling"]);
  });

  it("still counts a yes to an injury-only question when there was no injury", () => {
    expect(assessUrgency({ ...allNo(false), deformity: true }, { afterInjury: false }).urgency).toBe("emergency");
  });
});
