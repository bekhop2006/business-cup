import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";

// The only file that talks to the LLM provider.

const TIMEOUT_MS = 120_000;

// The provider could not be reached, timed out or rejected the request.
export class LlmUnavailableError extends Error {
  constructor(public readonly status: number | undefined) {
    super("The language model is unavailable.");
  }
}

export type LlmFile = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

let client: OpenAI | null = null;

function getClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: env.LLM_API_KEY,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
  });
  return client;
}

function fileContent(file: LlmFile) {
  const base64 = Buffer.from(file.bytes).toString("base64");
  const dataUrl = `data:${file.mimeType};base64,${base64}`;
  if (file.mimeType === "application/pdf") {
    return { type: "input_file" as const, filename: file.fileName, file_data: dataUrl };
  }
  return { type: "input_image" as const, image_url: dataUrl, detail: "high" as const };
}

// Sends one file with instructions and returns output that matches the schema,
// or null when the model's output does not match it.
// Throws LlmUnavailableError when the provider fails.
export async function readFileStructured<Schema extends z.ZodType>(options: {
  instructions: string;
  request: string;
  file: LlmFile;
  schema: Schema;
  schemaName: string;
}): Promise<z.infer<Schema> | null> {
  try {
    const response = await getClient().responses.parse({
      model: env.LLM_MODEL,
      instructions: options.instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: options.request },
            fileContent(options.file),
          ],
        },
      ],
      text: { format: zodTextFormat(options.schema, options.schemaName) },
      reasoning: { effort: "low" },
      store: false,
    });
    const parsed = options.schema.safeParse(response.output_parsed);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof OpenAI.APIError) throw new LlmUnavailableError(error.status);
    return null;
  }
}
