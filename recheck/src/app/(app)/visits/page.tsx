import { createServerSupabase } from "@/lib/db/supabase";
import { listVisits } from "@/lib/db/visits";

export default async function VisitsPage() {
  const supabase = await createServerSupabase();
  const visits = await listVisits(supabase);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Visits</h1>

      {visits.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-medium">No visits yet</p>
          <p className="mt-1 text-sm text-slate-600">
            When you add a medical bill, its visit will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {visits.map((visit) => (
            <li key={visit.id} className="flex justify-between gap-4 p-4">
              <span className="font-medium">{visit.provider_name}</span>
              <span className="text-sm text-slate-600">{visit.service_date}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
