import { writeStructured } from "@/lib/llm/client";
import { INTAKE_INSTRUCTIONS, intakeRequest } from "@/lib/llm/prompts/intake";
import { intakeSchema, type Intake } from "@/lib/schemas/intake";

export async function intakeCareCase(description: string): Promise<Intake | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await writeStructured({
      instructions: INTAKE_INSTRUCTIONS,
      request: intakeRequest(description),
      schema: intakeSchema,
      schemaName: "care_intake",
      timeoutMs: 20_000,
    });
    if (result) return result;
  }
  return null;
}
