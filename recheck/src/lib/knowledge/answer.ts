import type { AskAnswer } from "@/lib/schemas/ask";

// Pure parts of "Ask Recheck": which excerpts are close enough to use, and
// turning the model's output into what we show.

export const MATCH_COUNT = 8;
// How many of those are reserved for California excerpts when the person is in California.
export const CALIFORNIA_MATCHES = 2;
// Cosine distance above which an excerpt is too far from the question to use.
export const MAX_DISTANCE = 0.75;

export type KnowledgeMatch = {
  id: string;
  title: string;
  url: string;
  jurisdiction: string;
  publisher: string;
  checked_on: string;
  content: string;
  distance: number;
};

export type AskSource = { ns: number[]; title: string; url: string; jurisdiction: string; publisher: string; checkedOn: string };

export type AskResult =
  | { kind: "answer"; answer: string; sources: AskSource[] }
  | { kind: "not_in_sources" }
  | { kind: "symptoms" };

// Closest excerpts first, plus the closest California ones for people in
// California, without duplicates.
export function mergeMatches(all: KnowledgeMatch[], california: KnowledgeMatch[], limit: number): KnowledgeMatch[] {
  const merged = [...all.slice(0, limit - california.length)];
  for (const match of [...california, ...all.slice(limit - california.length)]) {
    if (merged.length >= limit) break;
    if (!merged.some((item) => item.id === match.id)) merged.push(match);
  }
  return merged;
}

// California ZIP codes start with 900–961.
export function stateFromZip(zip: string | null | undefined): "CA" | null {
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  const prefix = Number(zip.slice(0, 3));
  return prefix >= 900 && prefix <= 961 ? "CA" : null;
}

export function relevantMatches(matches: KnowledgeMatch[]): KnowledgeMatch[] {
  return matches.filter((match) => match.distance <= MAX_DISTANCE);
}

// Turns the model's output into what we show. Sources come from our database,
// never from the model's text; a number the model made up is dropped.
export function resolveAnswer(output: AskAnswer, matches: KnowledgeMatch[]): AskResult {
  if (output.kind === "symptoms") return { kind: "symptoms" };
  const used = [...new Set(output.used_sources)].filter((n) => n >= 1 && n <= matches.length).sort((a, b) => a - b);
  if (output.kind === "not_in_sources" || used.length === 0 || !output.answer.trim()) return { kind: "not_in_sources" };
  // One entry per document, numbered 1, 2, 3… in order; the answer's
  // citations are rewritten to those numbers.
  const sources: AskSource[] = [];
  const renumber = new Map<number, number>();
  for (const n of used) {
    const match = matches[n - 1];
    let index = sources.findIndex((source) => source.url === match.url);
    if (index === -1) {
      sources.push({ ns: [sources.length + 1], title: match.title, url: match.url, jurisdiction: match.jurisdiction, publisher: match.publisher, checkedOn: match.checked_on });
      index = sources.length - 1;
    }
    renumber.set(n, index + 1);
  }
  const answer = output.answer
    .trim()
    .replace(/\[(\d+)\]/g, (cite, n) => (renumber.has(Number(n)) ? `[${renumber.get(Number(n))}]` : ""))
    .replace(/(\[\d+\])(?:\1)+/g, "$1")
    .replace(/\s+([.,;])/g, "$1");
  return { kind: "answer", answer, sources };
}
