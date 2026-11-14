import type { UrgencyAssessment } from "@/lib/care/safety";

export function CareSafetyNotice({ assessment }: { assessment: UrgencyAssessment }) {
  if (assessment.urgency === "routine") return null;
  const emergency = assessment.urgency === "emergency";
  return (
    <section role="alert" className="my-6 rounded-xl border-2 border-[var(--rc-red)] bg-red-50 p-5 text-red-950">
      <h2 className="text-xl font-semibold">Get care now</h2>
      <p className="mt-2 font-medium">
        {emergency ? "Call 911 or go to the nearest emergency department now." : "Get medical advice or care today. If you cannot reach a clinician promptly, go to urgent care or an emergency department."}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <p className="mt-3 text-sm">This is not a diagnosis. If you think it may be an emergency, call 911. Don&apos;t delay care to compare prices.</p>
      {emergency && <a href="tel:911" className="mt-4 inline-block rounded-lg bg-red-900 px-5 py-3 font-semibold text-white">Call 911</a>}
    </section>
  );
}
