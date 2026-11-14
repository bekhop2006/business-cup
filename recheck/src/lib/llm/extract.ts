import { readFileStructured, type LlmFile } from "@/lib/llm/client";
import { EXTRACT_INSTRUCTIONS, EXTRACT_REQUEST } from "@/lib/llm/prompts/extract";
import {
  extractedDocumentSchema,
  type ExtractedDocument,
} from "@/lib/schemas/extracted";

const ATTEMPTS = 2;

// Pipeline step 2: document file -> ExtractedDocument.
// Returns null when the model's output is invalid twice in a row; the caller
// marks the document needs_review. Provider failures throw LlmUnavailableError.
export async function extractDocument(file: LlmFile): Promise<ExtractedDocument | null> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const extracted = await readFileStructured({
      instructions: EXTRACT_INSTRUCTIONS,
      request: EXTRACT_REQUEST,
      file,
      schema: extractedDocumentSchema,
      schemaName: "extracted_document",
    });
    if (extracted) return extracted;
  }
  return null;
}
