import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/auth";
import { getDocument, setDocumentStatus } from "@/lib/db/documents";
import { createServerSupabase } from "@/lib/db/supabase";
import { canRetryReading } from "@/lib/documents/status";
import { processDocument } from "@/lib/pipeline";

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

// Reads a document again after a failure or when it got stuck.
export async function POST(
  _request: Request,
  context: RouteContext<"/api/documents/[id]/process">,
) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);

  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return fail("Document not found.", 404);

  const supabase = await createServerSupabase();
  const document = await getDocument(supabase, user.id, id.data);
  if (!document) return fail("Document not found.", 404);
  if (!canRetryReading(document, new Date())) {
    return fail("This document is already being read.", 409);
  }

  await setDocumentStatus(supabase, user.id, id.data, "uploaded");
  after(() => processDocument(user.id, id.data));
  return Response.json({ id: id.data }, { status: 202 });
}
