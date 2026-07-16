import { describe, expect, it } from "vitest";

import {
  AUTH_WORKFLOW_STAGES,
  buildAuthErrorPath,
  getAuthMode,
  getFirstQueryValue
} from "@/lib/auth-page";

describe("authentication page model", () => {
  it("uses sign in unless the signup mode is explicitly selected", () => {
    expect(getAuthMode(undefined)).toBe("signin");
    expect(getAuthMode("signin")).toBe("signin");
    expect(getAuthMode("anything-else")).toBe("signin");
    expect(getAuthMode("signup")).toBe("signup");
  });

  it("normalizes repeated mode parameters using the first value", () => {
    expect(getAuthMode(["signup", "signin"])).toBe("signup");
    expect(getAuthMode(["signin", "signup"])).toBe("signin");
    expect(getAuthMode([])).toBe("signin");
  });

  it("uses one safe display value for repeated notice parameters", () => {
    expect(getFirstQueryValue("Account confirmed")).toBe("Account confirmed");
    expect(getFirstQueryValue(["First message", "Second message"])).toBe("First message");
    expect(getFirstQueryValue([])).toBeUndefined();
    expect(getFirstQueryValue(undefined)).toBeUndefined();
  });

  it("keeps the auth explanation aligned with the product's four-stage workflow", () => {
    expect(AUTH_WORKFLOW_STAGES.map((stage) => stage.label)).toEqual([
      "Selected evidence",
      "Contribution draft",
      "PM Agent check",
      "Peer confirmation"
    ]);
    expect(AUTH_WORKFLOW_STAGES[2].description).toContain("Advisory");
    expect(AUTH_WORKFLOW_STAGES[3].description).toContain("human");
  });

  it("keeps authentication errors on the form that produced them", () => {
    expect(buildAuthErrorPath("signin", "Invalid login credentials")).toBe(
      "/auth?error=Invalid+login+credentials"
    );
    expect(buildAuthErrorPath("signup", "User already registered")).toBe(
      "/auth?mode=signup&error=User+already+registered"
    );
  });
});
