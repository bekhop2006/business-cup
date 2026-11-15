import { appointmentIcs } from "@/lib/care/appointment";
import { displayProviderName } from "@/lib/providers/links";
import { getCurrentUser } from "@/lib/db/auth";
import { getCareCase } from "@/lib/db/care";
import { createServerSupabase } from "@/lib/db/supabase";
import { chosenProviderSchema } from "@/lib/schemas/providers";

// "Add to calendar" for an appointment the person booked themselves.
export async function GET(_request: Request, { params }: RouteContext<"/care/[id]/appointment.ics">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const careCase = await getCareCase(await createServerSupabase(), user.id, id).catch(() => null);
  const provider = chosenProviderSchema.safeParse(careCase?.chosen_provider);
  if (!careCase?.appointment_at || careCase.appointment_status !== "planned" || !provider.success) {
    return new Response("Not found", { status: 404 });
  }
  const body = appointmentIcs({
    caseId: id,
    startsAt: careCase.appointment_at,
    providerName: displayProviderName(provider.data.name),
    address: provider.data.address,
    phone: provider.data.phone,
    now: new Date(),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="recheck-appointment.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
