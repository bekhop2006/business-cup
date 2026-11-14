import { z } from "zod";
import { COMPARISON_ROUTE_IDS } from "@/lib/care/routes";

export const comparisonRouteSchema = z.enum(COMPARISON_ROUTE_IDS);
export const providerSourceSchema = z.enum(["google_places", "npi_registry"]);

export const providerSearchSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  searched_at: z.iso.datetime(),
  source: providerSourceSchema.nullable(),
  status: z.enum(["found", "empty", "unavailable"]),
  provider_ids: z.array(z.uuid()).max(10),
});

export type ProviderSearch = z.infer<typeof providerSearchSchema>;

export const chosenProviderSchema = z.object({
  id: z.uuid(),
  external_id: z.string().min(1),
  source: providerSourceSchema,
  name: z.string().min(1),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  maps_url: z.string().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  rating_count: z.number().int().nonnegative().nullable(),
  distance_meters: z.number().int().nonnegative().nullable(),
  network_status: z.literal("not_verified"),
});

export type ChosenProvider = z.infer<typeof chosenProviderSchema>;

const cents = z.number().int().nonnegative().safe();
const range = z.object({ lowCents: cents, highCents: cents });

// Read the saved forecast, rather than quietly replacing it with today's plan.
export const savedEstimateSchema = z.object({
  version: z.literal(1),
  calculated_at: z.iso.datetime(),
  route: comparisonRouteSchema,
  scenarios: z.array(z.object({
    id: z.enum(["visit", "visit_xray", "visit_mri"]),
    label: z.string(),
    patientShare: range,
  })).length(3),
  sources: z.object({
    medicare: z.object({ name: z.string(), year: z.number().int(), url: z.string() }),
    commercial_multiplier: z.object({
      lowBps: z.number().int(), highBps: z.number().int(),
      source: z.object({ name: z.string(), year: z.number().int(), url: z.string() }),
    }),
  }),
  comparison: z.object({
    baseline_route: z.literal("urgent_care"),
    baseline_patient_share: range,
    estimated_savings_cents: cents,
  }),
});
