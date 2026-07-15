import { describe, expect, it } from "vitest";
import { safeAuthRedirectPath } from "./redirect";

describe("safeAuthRedirectPath", () => {
  it("falls back when no destination is provided", () => {
    expect(safeAuthRedirectPath(null)).toBe("/dashboard");
  });

  it("allows an internal absolute path", () => {
    expect(safeAuthRedirectPath("/projects/project-123/ledger?tab=all")).toBe(
      "/projects/project-123/ledger?tab=all"
    );
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example/phish",
    "projects/project-123",
    "/dashboard\nhttps://evil.example",
  ])("rejects unsafe redirect destination %s", (destination) => {
    expect(safeAuthRedirectPath(destination)).toBe("/dashboard");
  });
});
