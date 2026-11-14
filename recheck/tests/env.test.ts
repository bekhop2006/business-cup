import { describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
vi.stubEnv("LLM_API_KEY", "llm-key");
vi.stubEnv("LLM_MODEL", "llm-model");
vi.stubEnv("APP_URL", "http://localhost:3000");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");

const { parseEnv } = await import("@/lib/env");

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  LLM_API_KEY: "llm-key",
  LLM_MODEL: "llm-model",
  APP_URL: "http://localhost:3000",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
};

describe("parseEnv", () => {
  it("accepts the required variables", () => {
    expect(parseEnv(valid).NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon");
  });

  it("names every missing required variable", () => {
    expect(() => parseEnv({})).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY, LLM_MODEL, APP_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
    );
  });

  it("rejects a Supabase URL that is not a URL", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("treats an empty optional variable as not set", () => {
    expect(parseEnv({ ...valid, CRON_SECRET: "" }).CRON_SECRET).toBe(
      undefined,
    );
  });
});
