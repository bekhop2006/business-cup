// Runs every file in fixtures/ through the real extraction and validation steps
// and compares the result with fixtures/expected.json.
// Usage: npm run check:extraction [-- file-name]
// Calls the LLM, so it needs LLM_API_KEY and LLM_MODEL in .env.local.

import { readFile } from "node:fs/promises";
import path from "node:path";

process.loadEnvFile(".env.local");

type Expected = {
  status: "parsed" | "needs_review";
  type?: string;
  serviceDate?: string;
  lineAmountsCents?: number[];
  statedTotalCents?: number;
  patientResponsibilityCents?: number;
};

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

async function main() {
  const { extractDocument } = await import("@/lib/llm/extract");
  const { validateExtraction } = await import("@/lib/documents/validate");
  const { parseMoneyToCents } = await import("@/lib/money");

  const expectations: Record<string, Expected> = JSON.parse(
    await readFile("fixtures/expected.json", "utf8"),
  );
  const only = process.argv[2];
  let failures = 0;

  for (const [fileName, expected] of Object.entries(expectations)) {
    if (only && fileName !== only) continue;
    const started = Date.now();
    const bytes = new Uint8Array(await readFile(path.join("fixtures", fileName)));
    const extracted = await extractDocument({
      bytes,
      mimeType: MIME_TYPES[path.extname(fileName)],
      fileName,
    });
    const validated = validateExtraction(extracted);
    const status = validated.problems.length > 0 ? "needs_review" : "parsed";

    const actual = {
      status,
      type: extracted?.document_type,
      serviceDate: extracted?.service_date ?? undefined,
      lineAmountsCents: validated.lineItems.map((line) => line.amount_cents),
      statedTotalCents: validated.statedTotalCents ?? undefined,
      patientResponsibilityCents:
        extracted?.patient_responsibility == null
          ? undefined
          : parseMoneyToCents(extracted.patient_responsibility) ?? undefined,
    };

    const mismatches = (Object.keys(expected) as (keyof Expected)[]).filter(
      (key) => JSON.stringify(expected[key]) !== JSON.stringify(actual[key]),
    );
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (mismatches.length === 0) {
      console.log(`PASS ${fileName} (${status}, ${seconds}s)`);
    } else {
      failures++;
      console.log(`FAIL ${fileName} (${seconds}s)`);
      for (const key of mismatches) {
        console.log(`  ${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`);
      }
    }
  }

  process.exitCode = failures > 0 ? 1 : 0;
}

main();
