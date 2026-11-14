import { z } from "zod";

// Text the LLM writes from data we already have. It explains and drafts; it
// never decides what is wrong and never calculates.

export const explanationSchema = z.object({
  lines: z.array(
    z.object({
      id: z.string().describe("The id of the line being explained, copied from the input"),
      explanation: z.string().describe("One or two plain sentences: what this service is"),
    }),
  ),
  flags: z.array(
    z.object({
      id: z.string().describe("The id of the flag being explained, copied from the input"),
      explanation: z
        .string()
        .describe("Two or three plain sentences: what this means and what to ask the provider"),
    }),
  ),
});

export type Explanation = z.infer<typeof explanationSchema>;

export const disputeSchema = z.object({
  letter: z.string().describe("The dispute letter, ready to copy, with [brackets] for details we don't have"),
  call_script: z.string().describe("A short phone script with what to say, what to ask and what to write down"),
});

export type DisputeDraft = z.infer<typeof disputeSchema>;
