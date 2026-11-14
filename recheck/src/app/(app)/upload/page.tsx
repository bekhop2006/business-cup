import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rc-navy)]/65">
        Upload · Review · Ask
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Let&apos;s take a closer look.</h1>
      <p className="mt-3 max-w-xl leading-relaxed text-[var(--rc-navy)]/70">
        Start with a medical bill or an Explanation of Benefits from your insurer.
        You can review the details after we read it.
      </p>
      <UploadForm />
      <aside className="mt-6 rounded-lg border border-[var(--rc-navy)]/15 bg-[var(--rc-navy)]/4 p-5" aria-label="Tips for a readable document">
        <h2 className="font-medium">For a clearer reading</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--rc-navy)]/70">
          <li>Include the provider, date, charges, and total.</li>
          <li>Take photos in good light with the whole page visible.</li>
          <li>Add the bill and insurance statement separately to compare them.</li>
        </ul>
      </aside>
      <p className="mt-6 text-xs leading-relaxed text-[var(--rc-navy)]/65">
        Your original file is stored privately. After reading, you can check the
        extracted details and correct anything that needs attention.
      </p>
    </>
  );
}
