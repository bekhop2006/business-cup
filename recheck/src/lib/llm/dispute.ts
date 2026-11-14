import { FLAG_TITLES } from "@/lib/checks";
import type { FlagType } from "@/lib/checks/types";
import { formatServiceDate } from "@/lib/dates";
import { writeStructured } from "@/lib/llm/client";
import { DISPUTE_INSTRUCTIONS, disputeRequest } from "@/lib/llm/prompts/dispute";
import { formatCents } from "@/lib/money";
import { disputeSchema, type DisputeDraft } from "@/lib/schemas/writing";

export type DisputeFacts = {
  provider_name: string;
  service_date: string;
  patient_name: string | null;
  account_number: string | null;
  claim_number: string | null;
  insurer_name: string | null;
  bill_says_you_owe_cents: number | null;
  insurer_says_you_owe_cents: number | null;
  flags: { type: FlagType; message: string; potential_savings_cents: number }[];
};

// visit + flags -> dispute letter and call script, generated on demand.
// Returns null when the output is invalid twice.
export async function writeDispute(facts: DisputeFacts): Promise<DisputeDraft | null> {
  const money = (cents: number | null) => (cents === null ? "not stated" : formatCents(cents));
  const request = disputeRequest({
    provider: facts.provider_name,
    date_of_service: formatServiceDate(facts.service_date),
    patient: facts.patient_name ?? "not stated",
    account_number: facts.account_number ?? "not stated",
    claim_number: facts.claim_number ?? "not stated",
    insurer: facts.insurer_name ?? "not stated",
    bill_says_patient_owes: money(facts.bill_says_you_owe_cents),
    insurer_says_patient_owes: money(facts.insurer_says_you_owe_cents),
    problems: facts.flags.map((flag) => ({
      problem: FLAG_TITLES[flag.type],
      details: flag.message,
      amount_in_question: flag.potential_savings_cents > 0 ? formatCents(flag.potential_savings_cents) : "not stated",
    })),
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await writeStructured({
      instructions: DISPUTE_INSTRUCTIONS,
      request,
      schema: disputeSchema,
      schemaName: "dispute",
    });
    if (result?.letter.trim() && result.call_script.trim()) return result;
  }
  return null;
}
