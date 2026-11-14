import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/routes";

describe("isPublicPath", () => {
  it("lets signed-out visitors open the home, login and API paths", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/stripe/webhook")).toBe(true);
  });

  it("keeps app pages private", () => {
    expect(isPublicPath("/visits")).toBe(false);
    expect(isPublicPath("/visits/123")).toBe(false);
    expect(isPublicPath("/login-help")).toBe(false);
  });
});
