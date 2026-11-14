import type { DocumentStatus } from "@/lib/db/documents";
import type { DocumentType } from "@/lib/schemas/extracted";

// After this long, a document still waiting to be read is treated as stuck
// (for example the server restarted mid-way) and can be retried.
const STUCK_AFTER_MS = 5 * 60 * 1000;

export function isBeingRead(status: DocumentStatus): boolean {
  return status === "uploaded" || status === "processing";
}

export function canRetryReading(
  document: { status: DocumentStatus; created_at: string },
  now: Date,
): boolean {
  if (document.status === "failed") return true;
  const age = now.getTime() - new Date(document.created_at).getTime();
  return isBeingRead(document.status) && age > STUCK_AFTER_MS;
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Waiting to be read",
  processing: "Reading",
  parsed: "Read",
  needs_review: "Needs your review",
  failed: "Couldn't read",
};

export function documentTypeLabel(type: DocumentType | null): string {
  switch (type) {
    case "bill":
      return "Bill";
    case "eob":
      return "Explanation of benefits";
    case "receipt":
      return "Receipt";
    default:
      return "Document";
  }
}
