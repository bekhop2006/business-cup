import { describe, expect, it } from "vitest";
import { canAskQuestion } from "@/lib/billing/plan";
import { chunkDocument, parseKnowledgeDocument } from "@/lib/knowledge/documents";
import { mergeMatches, relevantMatches, resolveAnswer, stateFromZip, type KnowledgeMatch } from "@/lib/knowledge/answer";

const doc = `---
title: Preventive care benefits for adults
url: https://www.healthcare.gov/preventive-care-adults/
jurisdiction: federal
publisher: HealthCare.gov
checked: 2026-11-15
---
## Covered services

Generally, these services are covered at no cost to you when provided by an in-network provider.

Flu shots are covered.
`;

const match = (overrides: Partial<KnowledgeMatch>): KnowledgeMatch => ({
  id: "chunk",
  title: "Preventive care benefits for adults",
  url: "https://www.healthcare.gov/preventive-care-adults/",
  jurisdiction: "federal",
  publisher: "HealthCare.gov",
  checked_on: "2026-11-15",
  content: "text",
  distance: 0.3,
  ...overrides,
});

describe("knowledge documents", () => {
  it("reads the front matter and body", () => {
    const parsed = parseKnowledgeDocument("healthcare-gov-preventive-adults.md", doc);
    expect(parsed).toMatchObject({
      sourceId: "healthcare-gov-preventive-adults",
      jurisdiction: "federal",
      publisher: "HealthCare.gov",
      checkedOn: "2026-11-15",
    });
  });

  it("rejects files without a source or with a bad name", () => {
    expect(parseKnowledgeDocument("notes.md", "no front matter")).toHaveProperty("error");
    expect(parseKnowledgeDocument("Bad Name.md", doc)).toHaveProperty("error");
    expect(parseKnowledgeDocument("x.md", doc.replace("https://www.healthcare.gov/preventive-care-adults/", "healthcare.gov"))).toHaveProperty("error");
  });

  it("starts every chunk with the title and nearest heading and keeps chunks short", () => {
    const parsed = parseKnowledgeDocument("a.md", doc);
    if ("error" in parsed) throw new Error(parsed.error);
    const chunks = chunkDocument(parsed);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startsWith("Preventive care benefits for adults — Covered services\n\n")).toBe(true);

    const long = chunkDocument({ title: "T", body: Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(" ") }, 200);
    expect(long.length).toBeGreaterThan(1);
    expect(long.every((chunk) => chunk.length <= 200 + 10)).toBe(true);
  });
});

describe("resolveAnswer", () => {
  const matches = [match({ id: "a" }), match({ id: "b", url: "https://www.cms.gov/nosurprises", title: "No Surprises", publisher: "CMS" })];

  it("keeps only sources the model used, from our records", () => {
    const result = resolveAnswer({ kind: "answer", answer: "Generally yes [1].", used_sources: [1, 1, 9] }, matches);
    expect(result).toEqual({
      kind: "answer",
      answer: "Generally yes [1].",
      sources: [{ ns: [1], title: "Preventive care benefits for adults", url: "https://www.healthcare.gov/preventive-care-adults/", jurisdiction: "federal", publisher: "HealthCare.gov", checkedOn: "2026-11-15" }],
    });
  });

  it("groups excerpts from the same document under one numbered source", () => {
    const sameDoc = [match({ id: "a" }), match({ id: "b", url: "https://www.cms.gov/x", title: "X" }), match({ id: "c" })];
    const result = resolveAnswer({ kind: "answer", answer: "Yes [1][3]. Also [2].", used_sources: [3, 1, 2] }, sameDoc);
    expect(result.kind === "answer" && result.sources.map((source) => source.ns)).toEqual([[1], [2]]);
    expect(result.kind === "answer" && result.answer).toBe("Yes [1]. Also [2].");
  });

  it("renumbers citations 1, 2… and drops numbers it can't back", () => {
    const many = Array.from({ length: 8 }, (_, i) => match({ id: String(i), url: `https://www.cms.gov/${i}` }));
    const result = resolveAnswer({ kind: "answer", answer: "Covered [4], with limits [7] [9].", used_sources: [7, 4] }, many);
    expect(result.kind === "answer" && result.answer).toBe("Covered [1], with limits [2].");
    expect(result.kind === "answer" && result.sources.map((source) => source.url)).toEqual(["https://www.cms.gov/3", "https://www.cms.gov/6"]);
  });

  it("refuses an answer that cites nothing", () => {
    expect(resolveAnswer({ kind: "answer", answer: "Yes.", used_sources: [] }, matches)).toEqual({ kind: "not_in_sources" });
    expect(resolveAnswer({ kind: "answer", answer: "Yes.", used_sources: [7] }, matches)).toEqual({ kind: "not_in_sources" });
  });

  it("passes symptom questions to the care flow", () => {
    expect(resolveAnswer({ kind: "symptoms", answer: "", used_sources: [] }, matches)).toEqual({ kind: "symptoms" });
  });

  it("drops excerpts too far from the question", () => {
    expect(relevantMatches([match({ distance: 0.4 }), match({ distance: 0.9 })])).toHaveLength(1);
  });
});

describe("mergeMatches", () => {
  it("keeps room for California excerpts without duplicates", () => {
    const all = ["a", "b", "c", "d"].map((id) => match({ id }));
    const california = ["x", "b"].map((id) => match({ id, jurisdiction: "california" }));
    expect(mergeMatches(all, california, 4).map((item) => item.id)).toEqual(["a", "b", "x", "c"]);
    expect(mergeMatches(all, [], 4).map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("stateFromZip", () => {
  it("recognizes California ZIP codes", () => {
    expect(stateFromZip("94110")).toBe("CA");
    expect(stateFromZip("90001")).toBe("CA");
    expect(stateFromZip("78701")).toBeNull();
    expect(stateFromZip(null)).toBeNull();
  });
});

describe("canAskQuestion", () => {
  it("gives free users one question", () => {
    expect(canAskQuestion("free", 0)).toBe(true);
    expect(canAskQuestion("free", 1)).toBe(false);
    expect(canAskQuestion("paid", 20)).toBe(true);
  });
});
