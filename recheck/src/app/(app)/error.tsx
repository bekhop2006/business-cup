"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
      <p className="font-medium text-red-800">Something went wrong on our side.</p>
      <p className="mt-1 text-sm text-red-700">
        Your data is safe. Try again, and if it keeps happening, reload the page.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
