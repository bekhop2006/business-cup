import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const required = z.string().min(1);
// Variables for features that are not built yet. Each one becomes required
// in the same commit that starts using it (see docs/PLAN.md).
const notYetUsed = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required,
  SUPABASE_SERVICE_ROLE_KEY: required,
  DATABASE_URL: notYetUsed,
  LLM_API_KEY: notYetUsed,
  LLM_MODEL: notYetUsed,
  STRIPE_SECRET_KEY: notYetUsed,
  STRIPE_WEBHOOK_SECRET: notYetUsed,
  EMAIL_API_KEY: notYetUsed,
  INBOUND_EMAIL_SECRET: notYetUsed,
  CRON_SECRET: notYetUsed,
  APP_URL: notYetUsed,
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
