// Pure rules for deciding whether a document belongs to an existing visit.
// A visit is one provider, one date of service and one family member.

// Words that differ between how a bill and an EOB spell the same provider.
const NOISE_WORDS = new Set(["the", "inc", "llc", "pc", "pa", "md", "of", "and"]);

function providerWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !NOISE_WORDS.has(word));
}

// "Lakeview General Hospital" and "LAKEVIEW GENERAL HOSPITAL, INC." are the
// same provider; so are names where one contains every word of the other.
export function sameProvider(a: string, b: string): boolean {
  const wordsA = providerWords(a);
  const wordsB = providerWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  return shorter.every((word) => longer.includes(word));
}

// Trims and collapses spaces; letter case is compared case-insensitively.
export function cleanPersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function samePerson(a: string, b: string): boolean {
  return cleanPersonName(a).toLowerCase() === cleanPersonName(b).toLowerCase();
}

export type VisitCandidate = {
  id: string;
  provider_name: string;
  service_date: string;
  family_member_id: string | null;
};

// A visit matches when the provider and date are the same and the family
// member is the same, or unknown on either side.
export function findMatchingVisit<Visit extends VisitCandidate>(
  visits: Visit[],
  document: { provider_name: string; service_date: string; family_member_id: string | null },
): Visit | null {
  return (
    visits.find(
      (visit) =>
        visit.service_date === document.service_date &&
        sameProvider(visit.provider_name, document.provider_name) &&
        (visit.family_member_id === null ||
          document.family_member_id === null ||
          visit.family_member_id === document.family_member_id),
    ) ?? null
  );
}
