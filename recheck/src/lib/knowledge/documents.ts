import { z } from "zod";

// Official documents in knowledge/*.md: front matter with the source, then
// the text. Split into chunks for retrieval; every chunk keeps its source.

const frontMatterSchema = z.object({
  title: z.string().min(1),
  url: z.string().regex(/^https:\/\/\S+$/),
  jurisdiction: z.enum(["federal", "california"]),
  publisher: z.string().min(1),
  checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type KnowledgeDocument = {
  sourceId: string;
  title: string;
  url: string;
  jurisdiction: "federal" | "california";
  publisher: string;
  checkedOn: string;
  body: string;
};

export function parseKnowledgeDocument(fileName: string, text: string): KnowledgeDocument | { error: string } {
  const sourceId = fileName.replace(/\.md$/, "");
  if (!/^[a-z0-9-]{1,80}$/.test(sourceId)) return { error: `${fileName}: file name must be kebab-case` };
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
  if (!match) return { error: `${fileName}: missing front matter` };
  const fields = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
  );
  const parsed = frontMatterSchema.safeParse(fields);
  if (!parsed.success) return { error: `${fileName}: front matter needs title, url, jurisdiction, publisher, checked` };
  const body = match[2].trim();
  if (!body) return { error: `${fileName}: empty body` };
  return {
    sourceId,
    title: parsed.data.title,
    url: parsed.data.url,
    jurisdiction: parsed.data.jurisdiction,
    publisher: parsed.data.publisher,
    checkedOn: parsed.data.checked,
    body,
  };
}

// Splits on paragraphs, keeping each chunk under maxChars and starting it with
// the document title and the nearest heading, so a chunk makes sense alone.
export function chunkDocument(document: Pick<KnowledgeDocument, "title" | "body">, maxChars = 1200): string[] {
  const chunks: string[] = [];
  let heading = "";
  let current: string[] = [];
  let currentHeading = "";

  const flush = () => {
    if (current.length === 0) return;
    const prefix = [document.title, currentHeading].filter(Boolean).join(" — ");
    chunks.push(`${prefix}\n\n${current.join("\n\n")}`);
    current = [];
  };

  for (const block of document.body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(block);
    if (headingMatch && !block.includes("\n")) {
      flush();
      heading = headingMatch[1].trim();
      currentHeading = heading;
      continue;
    }
    const pieces = block.length > maxChars ? splitLong(block, maxChars) : [block];
    for (const piece of pieces) {
      const size = current.reduce((total, part) => total + part.length + 2, 0);
      if (current.length > 0 && size + piece.length > maxChars) {
        flush();
        currentHeading = heading;
      }
      current.push(piece);
    }
  }
  flush();
  return chunks;
}

function splitLong(block: string, maxChars: number): string[] {
  const sentences = block.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let part = "";
  for (const sentence of sentences) {
    if (part && part.length + sentence.length + 1 > maxChars) {
      parts.push(part);
      part = "";
    }
    part = part ? `${part} ${sentence}` : sentence.slice(0, maxChars);
  }
  if (part) parts.push(part);
  return parts;
}
