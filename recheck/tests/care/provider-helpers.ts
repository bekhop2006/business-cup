import type { CareCase, CaseProvider } from "@/lib/db/care";
import { SAFETY_QUESTIONS } from "@/lib/care/safety";
import type { CaseContext } from "@/lib/schemas/intake";
import type { ProviderResult } from "@/lib/providers";

export const CASE_ID = "00000000-0000-4000-8000-000000000001";
export const USER_ID = "00000000-0000-4000-8000-000000000002";
export const PROVIDER_ID = "00000000-0000-4000-8000-000000000003";
export const REVISION = "00000000-0000-4000-8000-000000000004";

export function routineContext(): CaseContext {
  return {
    intake: null, revision: REVISION, scope: "knee_leg",
    answers: Object.fromEntries(SAFETY_QUESTIONS.map(({ id }) => [id, false])),
    provider_searches: {
      sports_medicine: { zip: "78701", searched_at: "2026-11-15T00:00:00Z", source: "npi_registry", status: "found", provider_ids: [PROVIDER_ID] },
    },
  };
}

export function careCase(context = routineContext()): CareCase {
  return {
    id: CASE_ID, user_id: USER_ID, created_at: "2026-11-15T00:00:00Z",
    description: "Knee pain after tennis.", summary: null, body_area: "knee_leg",
    appointment_at: null, appointment_status: null,
    urgency: "routine", warning_answers: context, route: null,
    chosen_provider: null, estimate: null, estimated_savings_cents: null,
  };
}

export const providerRow: CaseProvider = {
  id: PROVIDER_ID, user_id: USER_ID, case_id: CASE_ID, created_at: "2026-11-15T00:00:00Z",
  route: "sports_medicine", source: "npi_registry", external_id: "1234567890",
  name: "Example Sports Medicine", address: "123 Example St, Austin, TX 78701",
  phone: "512-555-0100", website: null, maps_url: null, rating: null,
  rating_count: null, distance_meters: null, network_status: "not_verified",
};

export const providerResult: ProviderResult = {
  source: "npi_registry", externalId: providerRow.external_id,
  name: providerRow.name, address: providerRow.address!, phone: providerRow.phone,
  website: null, mapsUrl: null, rating: null, ratingCount: null, distanceMeters: null,
  networkStatus: "not_verified", location: null, specialty: "Sports Medicine",
};
