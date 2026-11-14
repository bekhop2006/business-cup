import { formatCents } from "@/lib/money";
import { newestFirst, type Check } from "@/lib/checks/types";

// The newest bill asks the patient for more than the newest EOB says the
// patient is responsible for. Asking for less is not flagged.
export const findEobMismatch: Check = (input) => {
  const bill = input.documents.filter((d) => d.type === "bill").sort(newestFirst)[0];
  const eob = input.documents.filter((d) => d.type === "eob").sort(newestFirst)[0];
  const billOwes = bill?.patient_responsibility_cents;
  const eobOwes = eob?.patient_responsibility_cents;
  if (!bill || billOwes == null || eobOwes == null || billOwes <= eobOwes) return [];

  const difference = billOwes - eobOwes;
  return [
    {
      type: "eob_mismatch",
      line_item_id: null,
      document_id: bill.id,
      message: `The bill asks you to pay ${formatCents(billOwes)}, but your insurer's Explanation of Benefits says your share is ${formatCents(eobOwes)}. That's ${formatCents(difference)} more than your plan says you owe, which is worth asking about.`,
      potential_savings_cents: difference,
    },
  ];
};
