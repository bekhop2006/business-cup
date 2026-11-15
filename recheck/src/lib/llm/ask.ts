import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { embedTexts, writeStructured } from "@/lib/llm/client";
import { ASK_INSTRUCTIONS, askRequest } from "@/lib/llm/prompts/ask";
import { CALIFORNIA_MATCHES, MATCH_COUNT, mergeMatches, relevantMatches, resolveAnswer, stateFromZip, type AskResult } from "@/lib/knowledge/answer";
import { askAnswerSchema } from "@/lib/schemas/ask";

// "Ask Recheck": retrieve the closest official excerpts and let the model
// answer only from them; src/lib/knowledge/answer.ts keeps only sources it used.

type Db = SupabaseClient<Database>;

export async function askRecheck(
  db: Db,
  question: string,
  person: { zip: string | null; planType: string | null },
): Promise<AskResult | null> {
  const [embedding] = await embedTexts([question]);
  const state = stateFromZip(person.zip);
  const search = async (count: number, onlyJurisdiction?: "california") => {
    const { data, error } = await db.rpc("match_knowledge", {
      query_embedding: JSON.stringify(embedding),
      match_count: count,
      ...(onlyJurisdiction ? { only_jurisdiction: onlyJurisdiction } : {}),
    });
    if (error) throw new Error("Could not search the knowledge base.");
    return relevantMatches(data);
  };
  const [all, california] = await Promise.all([
    search(MATCH_COUNT),
    state === "CA" ? search(CALIFORNIA_MATCHES, "california") : Promise.resolve([]),
  ]);
  // Even with no close excerpts the model still runs: it recognizes symptom
  // questions and otherwise says the sources don't cover it.
  const matches = mergeMatches(all, california, MATCH_COUNT);

  const output = await writeStructured({
    instructions: ASK_INSTRUCTIONS,
    request: askRequest(
      question,
      { state, planType: person.planType },
      matches.map((match, index) => ({
        n: index + 1,
        title: match.title,
        jurisdiction: match.jurisdiction,
        publisher: match.publisher,
        text: match.content,
      })),
    ),
    schema: askAnswerSchema,
    schemaName: "ask_answer",
    timeoutMs: 60_000,
  });
  return output ? resolveAnswer(output, matches) : null;
}
