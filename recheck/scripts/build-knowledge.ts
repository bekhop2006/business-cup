// Loads knowledge/*.md into knowledge_chunks with embeddings, replacing what
// was there. Prints counts only.
// Usage: npm run build:knowledge [-- .env.development.local]
// The optional env file is loaded before .env.local and wins over it.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

for (const file of [process.argv[2], ".env.local"].filter(Boolean)) {
  process.loadEnvFile(file);
}

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");

async function main() {
  const { createAdminSupabase } = await import("@/lib/db/admin");
  const { chunkDocument, parseKnowledgeDocument } = await import("@/lib/knowledge/documents");
  const { embedTexts } = await import("@/lib/llm/client");

  const db = createAdminSupabase();
  const files = readdirSync(KNOWLEDGE_DIR).filter((name) => name.endsWith(".md")).sort();
  const sourceIds: string[] = [];
  let total = 0;

  for (const fileName of files) {
    const document = parseKnowledgeDocument(fileName, readFileSync(join(KNOWLEDGE_DIR, fileName), "utf8"));
    if ("error" in document) throw new Error(document.error);
    const chunks = chunkDocument(document);
    const embeddings = await embedTexts(chunks);

    const { error: deleteError } = await db.from("knowledge_chunks").delete().eq("source_id", document.sourceId);
    if (deleteError) throw new Error(`Could not clear ${document.sourceId}.`);
    const { error } = await db.from("knowledge_chunks").insert(
      chunks.map((content, position) => ({
        source_id: document.sourceId,
        title: document.title,
        url: document.url,
        jurisdiction: document.jurisdiction,
        publisher: document.publisher,
        checked_on: document.checkedOn,
        position,
        content,
        embedding: JSON.stringify(embeddings[position]),
      })),
    );
    if (error) throw new Error(`Could not save ${document.sourceId}.`);
    sourceIds.push(document.sourceId);
    total += chunks.length;
    console.log(`${document.sourceId}: ${chunks.length} chunks`);
  }

  // Documents removed from the folder leave the knowledge base too.
  const { error } = await db.from("knowledge_chunks").delete().not("source_id", "in", `(${sourceIds.join(",")})`);
  if (error) throw new Error("Could not remove old documents.");
  console.log(`Loaded ${files.length} documents, ${total} chunks.`);
}

main();
