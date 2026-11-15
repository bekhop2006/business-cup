import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const required = z.string().min(1);
const optional = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  SUPABASE_SERVICE_ROLE_KEY: required,
  LLM_API_KEY: required,
  LLM_MODEL: required,
  APP_URL: z.url(),
  STRIPE_SECRET_KEY: required,
  STRIPE_WEBHOOK_SECRET: required,
  // Optional: without it, provider search uses the free NPI Registry only.
  GOOGLE_PLACES_API_KEY: optional,
  // Optional: the shared demo account judges and visitors open without signing up.
  DEMO_EMAIL: optional,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Missing or invalid environment variables: ${names.join(", ")}`,
    );
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
