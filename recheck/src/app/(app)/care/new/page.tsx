import { CareDescriptionForm } from "@/components/CareDescriptionForm";

export default function NewCarePage() {
  return (
    <>
      <h1>What&apos;s bothering you?</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--rc-muted)]">Start with your own words. We&apos;ll check warning signs first, then help you compare care options and understand possible costs. This version covers knee or leg pain.</p>
      <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">If you have chest pain, trouble breathing, or think this is an emergency, <a href="tel:911" className="font-semibold underline">call 911</a> or get emergency care now. Don&apos;t wait for Recheck.</p>
      <CareDescriptionForm />
    </>
  );
}
