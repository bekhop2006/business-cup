"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXTENSIONS,
} from "@/lib/schemas/upload";

type State = { kind: "idle" } | { kind: "uploading"; name: string } | { kind: "error"; message: string };

function checkFile(file: File): string | null {
  if (!(file.type in UPLOAD_EXTENSIONS)) return "Upload a PDF or a photo (JPG, PNG or WebP).";
  if (file.size > MAX_UPLOAD_BYTES) return "This file is larger than 8 MB. Try a smaller photo or a PDF.";
  return null;
}

export function UploadForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file || state.kind === "uploading") return;
    const problem = checkFile(file);
    if (problem) return setState({ kind: "error", message: problem });

    setState({ kind: "uploading", name: file.name });
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body });
      const result: { id?: string; error?: string } = await response.json();
      if (!response.ok || !result.id) {
        return setState({ kind: "error", message: result.error ?? "Upload failed. Please try again." });
      }
      router.push(`/documents/${result.id}`);
    } catch {
      setState({ kind: "error", message: "Upload failed. Check your connection and try again." });
    }
  }

  const uploading = state.kind === "uploading";

  return (
    <div className="mt-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-slate-900 bg-slate-50" : "border-slate-300"
        }`}
      >
        {uploading ? (
          <p className="font-medium" role="status">
            Uploading {state.name}…
          </p>
        ) : (
          <>
            <p className="font-medium">Drop a bill or an insurance statement here</p>
            <p className="text-sm text-slate-600">PDF or photo, up to 8 MB</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white sm:hidden"
              >
                Take a photo
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium max-sm:bg-white sm:bg-slate-900 sm:text-white"
              >
                Choose a file
              </button>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_UPLOAD_TYPES}
        className="hidden"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(event) => upload(event.target.files?.[0])}
      />

      {state.kind === "error" && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
