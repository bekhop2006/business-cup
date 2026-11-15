import { z } from "zod";

// What the model returns for an "Ask Recheck" question. Source numbers refer
// to the numbered official excerpts it was given; code checks them.
export const askAnswerSchema = z.object({
  kind: z.enum(["answer", "not_in_sources", "symptoms"]),
  answer: z.string().max(1500),
  used_sources: z.array(z.number().int().min(1).max(10)).max(6),
});

export type AskAnswer = z.infer<typeof askAnswerSchema>;

export const askQuestionSchema = z
  .string()
  .trim()
  .min(5, "Type a question, for example: Is a flu shot free with my insurance?")
  .max(500, "Keep the question under 500 characters.");
