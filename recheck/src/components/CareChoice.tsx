import Link from "next/link";
import { priceRange } from "@/components/CostForecast";
import { ProviderDetails } from "@/components/ProviderDetails";
import { CARE_ROUTES } from "@/lib/care/routes";
import { formatCents } from "@/lib/money";
import { safeHttpUrl } from "@/lib/providers/links";
import { chosenProviderSchema, savedEstimateSchema } from "@/lib/schemas/providers";

const QUESTIONS = [
  "Are this clinician and this exact location in-network for my exact insurance plan? Please verify the plan name, not just the insurer.",
  "Are you accepting new patients, and when can I be seen?",
  "Does my plan require a referral or prior authorization for this visit or any proposed imaging?",
  "What billing codes do you expect, and can you give me a written estimate of the allowed amount and my share?",
  "Is there a separate hospital or facility fee? Are tests, imaging and the doctor's interpretation billed separately?",
  "Will you check with me before adding any tests or services that cost extra?",
];

export function CareChoice({ providerValue, estimateValue }: { providerValue: unknown; estimateValue: unknown }) {
  const provider = chosenProviderSchema.safeParse(providerValue);
  const estimate = savedEstimateSchema.safeParse(estimateValue);
  if (!provider.success || !estimate.success) return null;
  const snapshot = estimate.data;
  const medicare = safeHttpUrl(snapshot.sources.medicare.url);
  const commercial = safeHttpUrl(snapshot.sources.commercial_multiplier.source.url);
  return (
    <section id="your-choice" className="mt-8 scroll-mt-6 rounded-xl border-2 border-[var(--rc-navy)]/30 p-5">
      <h2 className="text-xl font-medium">Your saved choice</h2>
      <p role="status" className="mt-2 text-sm text-[var(--rc-muted)]">Your case, provider and estimate are saved. No appointment has been booked.</p>
      <div className="mt-4"><ProviderDetails provider={provider.data} /></div>
      <h3 className="mt-5 font-medium">Saved estimate · {CARE_ROUTES[snapshot.route].label}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {snapshot.scenarios.map((scenario) => <div key={scenario.id} className="rounded-lg bg-[var(--rc-navy)]/4 p-3">
          <dt className="text-sm">{scenario.label}</dt><dd className="mt-1 font-medium tabular-nums">{priceRange(scenario.patientShare)}</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs text-[var(--rc-muted)]">Your estimated share using your profile when saved on {snapshot.calculated_at.slice(0, 10)} UTC. Not a clinic quote. This does not mean you need an X-ray or MRI.</p>
      <p className="mt-3 text-sm font-medium">Estimated difference vs. an urgent care visit only: {formatCents(snapshot.comparison.estimated_savings_cents)}.</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--rc-muted)]">The urgent care estimate was {priceRange(snapshot.comparison.baseline_patient_share)}. This compares care types under the same insurance assumptions, not prices at individual clinics. Overlapping ranges count as $0 estimated savings. This is not money already saved, and cost should never delay necessary care.</p>
      <p className="mt-2 text-xs text-[var(--rc-muted)]">Saved sources: {medicare && <a href={medicare} target="_blank" rel="noreferrer" className="underline">CMS PFS {snapshot.sources.medicare.year}</a>}; multiplier assumption ×{snapshot.sources.commercial_multiplier.lowBps / 10000}–{snapshot.sources.commercial_multiplier.highBps / 10000}{commercial && <> from <a href={commercial} target="_blank" rel="noreferrer" className="underline">KFF ({snapshot.sources.commercial_multiplier.source.year})</a></>}.</p>
      <h3 className="mt-6 font-medium">Before you book: questions for the call</h3>
      <p className="mt-1 text-sm text-[var(--rc-muted)]">Recheck hasn&apos;t verified your insurance network. Confirm with the provider and your insurer.</p>
      <ul className="mt-3 space-y-3">
        {QUESTIONS.map((question) => <li key={question}><label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-4 shrink-0" />{question}</label></li>)}
      </ul>
      <p className="mt-2 text-xs text-[var(--rc-muted)]">The checklist is for your call; checkmarks are not saved.</p>
      <p className="mt-6 text-sm">After the visit, <Link href="/upload" className="font-medium underline">add a bill</Link> to check the charges.</p>
    </section>
  );
}
