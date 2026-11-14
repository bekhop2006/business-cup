import { z } from "zod";
import { SAFETY_QUESTIONS } from "@/lib/care/safety";

export const careRouteIdSchema = z.enum(["primary_care", "sports_medicine", "urgent_care", "emergency_room"]);
export const safetyQuestionIdSchema = z.enum(SAFETY_QUESTIONS.map((question) => question.id));
export const bodyAreaSchema = z.enum(["knee_leg", "other", "unspecified"]);

export const intakeSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  body_area: bodyAreaSchema,
  duration_text: z.string().max(120).nullable(),
  suggested_routes: z.array(careRouteIdSchema).max(4),
  mentioned_warning_signs: z.array(safetyQuestionIdSchema).max(SAFETY_QUESTIONS.length),
});

export type Intake = z.infer<typeof intakeSchema>;

// Keep suggestions separate from answers the person actually confirmed.
export const caseContextSchema = z.object({
  intake: intakeSchema.nullable(),
  answers: z.partialRecord(safetyQuestionIdSchema, z.boolean()).optional(),
  scope: z.enum(["knee_leg", "other"]).optional(),
});

export type CaseContext = z.infer<typeof caseContextSchema>;

export const caseDescriptionSchema = z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(2000, "Keep your description under 2,000 characters.");

export function readCaseContext(value: unknown): CaseContext {
  const result = caseContextSchema.safeParse(value);
  return result.success ? result.data : { intake: null };
}
