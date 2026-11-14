import { FLAG_TITLES } from "@/lib/checks";
import type { FlagType } from "@/lib/checks/types";
import { writeStructured } from "@/lib/llm/client";
import { EXPLAIN_INSTRUCTIONS, explainRequest } from "@/lib/llm/prompts/explain";
import { formatCents } from "@/lib/money";
import { explanationSchema, type Explanation } from "@/lib/schemas/writing";

type Line = { id: string; code: string | null; description: string | null; amount_cents: number };
type Flag = { id: string; type: FlagType; message: string };

// Pipeline step 6: lines + flags -> plain-language text. Only explanations for
// ids we sent are kept. Returns null when the output is invalid twice.
export async function explainVisit(input: { lines: Line[]; flags: Flag[] }): Promise<Explanation | null> {
  const request = explainRequest({
    lines: input.lines.map((line) => ({
      id: line.id,
      code: line.code,
      description: line.description,
      amount: formatCents(line.amount_cents),
    })),
    flags: input.flags.map((flag) => ({ id: flag.id, title: FLAG_TITLES[flag.type], message: flag.message })),
  });
  const lineIds = new Set(input.lines.map((line) => line.id));
  const flagIds = new Set(input.flags.map((flag) => flag.id));

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await writeStructured({
      instructions: EXPLAIN_INSTRUCTIONS,
      request,
      schema: explanationSchema,
      schemaName: "explanations",
    });
    if (result) {
      return {
        lines: result.lines.filter((line) => lineIds.has(line.id) && line.explanation.trim()),
        flags: result.flags.filter((flag) => flagIds.has(flag.id) && flag.explanation.trim()),
      };
    }
  }
  return null;
}
