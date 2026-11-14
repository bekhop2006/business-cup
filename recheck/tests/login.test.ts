import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticate } from "@/app/(auth)/login/actions";
import { createServerSupabase } from "@/lib/db/supabase";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/lib/db/supabase", () => ({ createServerSupabase: vi.fn() }));

const signUp = vi.fn();
const signInWithPassword = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createServerSupabase).mockResolvedValue(
    { auth: { signUp, signInWithPassword } } as unknown as Awaited<ReturnType<typeof createServerSupabase>>,
  );
  signUp.mockResolvedValue({ data: { session: {} }, error: null });
  signInWithPassword.mockResolvedValue({ error: null });
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("authenticate", () => {
  it("refuses a sign-up when the two passwords differ", async () => {
    const state = await authenticate({}, form({
      intent: "signup", email: "michael@example.com", password: "kneepain123", confirmPassword: "kneepain124",
    }));
    expect(state.error).toContain("don't match");
    expect(state.email).toBe("michael@example.com");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("refuses a sign-up without the confirmation", async () => {
    const state = await authenticate({}, form({ intent: "signup", email: "michael@example.com", password: "kneepain123" }));
    expect(state.error).toContain("don't match");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up when both passwords match", async () => {
    await expect(authenticate({}, form({
      intent: "signup", email: "michael@example.com", password: "kneepain123", confirmPassword: "kneepain123",
    }))).rejects.toThrow("redirect:/home");
    expect(signUp).toHaveBeenCalledWith({ email: "michael@example.com", password: "kneepain123" });
  });

  it("does not ask for a confirmation when logging in", async () => {
    await expect(authenticate({}, form({ intent: "login", email: "michael@example.com", password: "kneepain123" })))
      .rejects.toThrow("redirect:/home");
    expect(signInWithPassword).toHaveBeenCalled();
  });
});
