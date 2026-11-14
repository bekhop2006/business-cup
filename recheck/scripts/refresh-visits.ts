// Recomputes totals, flags and explanations for every visit, for example after
// a check is added or changed. Prints counts only, never document contents.
// Usage: npm run refresh:visits [-- .env.development.local]
// The optional env file is loaded before .env.local and wins over it.

for (const file of [process.argv[2], ".env.local"].filter(Boolean)) {
  process.loadEnvFile(file);
}

async function main() {
  const { createAdminSupabase } = await import("@/lib/db/admin");
  const { refreshVisit, explainVisitText } = await import("@/lib/visits/refresh");

  const db = createAdminSupabase();
  const { data: visits, error } = await db.from("visits").select("id, user_id");
  if (error) throw new Error("Could not list visits.");

  for (const visit of visits) {
    await refreshVisit(db, visit.user_id, visit.id);
    await explainVisitText(db, visit.user_id, visit.id);
    const { count } = await db
      .from("flags")
      .select("id", { count: "exact", head: true })
      .eq("visit_id", visit.id);
    console.log(`visit ${visit.id.slice(0, 8)}: ${count ?? 0} flags`);
  }
  console.log(`Refreshed ${visits.length} visits.`);
}

main();
