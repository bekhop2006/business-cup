import { bills, type Check } from "@/lib/checks/types";

// A bill exists, no EOB is attached, and the bill shows no insurance payment:
// the patient is being billed before the insurer has processed the claim.
export const findBilledBeforeInsurance: Check = (input) => {
  if (input.documents.some((document) => document.type === "eob")) return [];
  return bills(input)
    .filter((bill) => !bill.insurance_paid_cents)
    .map((bill) => ({
      type: "billed_before_insurance" as const,
      line_item_id: null,
      document_id: bill.id,
      message:
        "This bill shows no insurance payment yet, and we don't have your insurer's Explanation of Benefits for this visit. It looks like you're being billed before your insurance has processed the claim. It's usually worth waiting for the Explanation of Benefits before paying.",
      potential_savings_cents: 0,
    }));
};
