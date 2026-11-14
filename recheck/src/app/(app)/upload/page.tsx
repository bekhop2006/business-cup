import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Add a document</h1>
      <p className="mt-2 text-slate-600">
        Upload a medical bill or an Explanation of Benefits from your insurer. We&apos;ll read
        every line and show you what you&apos;re being charged for.
      </p>
      <UploadForm />
      <p className="mt-6 text-xs text-slate-500">
        Your files are stored privately and only you can see them.
      </p>
    </>
  );
}
