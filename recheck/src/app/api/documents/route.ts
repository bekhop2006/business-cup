import { after } from "next/server";
import { getCurrentUser } from "@/lib/db/auth";
import { DOCUMENTS_BUCKET } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { processDocument } from "@/lib/pipeline";
import {
  UPLOAD_EXTENSIONS,
  sniffUploadType,
  uploadFileSchema,
} from "@/lib/schemas/upload";

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

// Stores an uploaded bill or EOB and starts reading it in the background.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);

  const form = await request.formData().catch(() => null);
  const parsed = uploadFileSchema.safeParse(form?.get("file"));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const file = parsed.data;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffUploadType(bytes);
  if (!mimeType) return fail("Upload a PDF or a photo (JPG, PNG or WebP).", 400);

  const supabase = await createServerSupabase();
  const documentId = crypto.randomUUID();
  const storagePath = `${user.id}/${documentId}.${UPLOAD_EXTENSIONS[mimeType]}`;

  const stored = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType });
  if (stored.error) return fail("We couldn't save your file. Please try again.", 500);

  const created = await supabase.from("documents").insert({
    id: documentId,
    storage_path: storagePath,
    file_name: file.name.slice(0, 200) || `document.${UPLOAD_EXTENSIONS[mimeType]}`,
    mime_type: mimeType,
    source: "upload",
  });
  if (created.error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return fail("We couldn't save your file. Please try again.", 500);
  }

  after(() => processDocument(user.id, documentId));
  return Response.json({ id: documentId }, { status: 201 });
}
