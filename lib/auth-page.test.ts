import { describe, expect, it } from "vitest";

import {
  AUTH_WORKFLOW_STAGES,
  buildAuthErrorPath,
  buildAuthMessagePath,
  buildPasswordRecoveryRedirect,
  getAuthMode,
  getFirstQueryValue,
  isPasswordRecoveryDestination,
  passwordRecoveryCookieOptions,
  resolveAuthOrigin,
  validatePasswordUpdate
} from "@/lib/auth-page";

describe("authentication page model", () => {
  it("uses sign in unless the signup mode is explicitly selected", () => {
    expect(getAuthMode(undefined)).toBe("signin");
    expect(getAuthMode("signin")).toBe("signin");
    expect(getAuthMode("anything-else")).toBe("signin");
    expect(getAuthMode("signup")).toBe("signup");
    expect(getAuthMode("forgot")).toBe("forgot");
    expect(getAuthMode("reset")).toBe("reset");
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
    expect(buildAuthErrorPath("forgot", "Try again later")).toBe(
      "/auth?mode=forgot&error=Try+again+later"
    );
    expect(buildAuthErrorPath("reset", "Recovery session expired")).toBe(
      "/auth?mode=reset&error=Recovery+session+expired"
    );
  });

  it("keeps success messages on the intended auth mode", () => {
    expect(buildAuthMessagePath("signin", "Password updated")).toBe(
      "/auth?message=Password+updated"
    );
    expect(buildAuthMessagePath("forgot", "Check your email")).toBe(
      "/auth?mode=forgot&message=Check+your+email"
    );
  });

  it("builds a same-origin recovery callback into the reset form", () => {
    expect(buildPasswordRecoveryRedirect("https://ledger.example/some/path")).toBe(
      "https://ledger.example/auth/callback?next=%2Fauth%3Fmode%3Dreset"
    );
    expect(() => buildPasswordRecoveryRedirect("javascript:alert(1)")).toThrow(
      "Password recovery requires an HTTP or HTTPS origin"
    );
  });

  it("prefers a configured site origin and rejects a mismatched request origin", () => {
    expect(
      resolveAuthOrigin({
        configuredUrl: "https://ledger.example/app",
        requestOrigin: "https://preview.example",
        requestHost: "preview.example"
      })
    ).toBe("https://ledger.example");
    expect(
      resolveAuthOrigin({
        configuredUrl: undefined,
        requestOrigin: "https://ledger.example",
        requestHost: "ledger.example"
      })
    ).toBe("https://ledger.example");
    expect(() =>
      resolveAuthOrigin({
        configuredUrl: undefined,
        requestOrigin: "https://evil.example",
        requestHost: "ledger.example"
      })
    ).toThrow("Password recovery origin does not match the request host");
  });

  it("validates a replacement password before calling the auth provider", () => {
    expect(validatePasswordUpdate("short", "short")).toBe(
      "Password must be at least 6 characters."
    );
    expect(validatePasswordUpdate("new-password", "different-password")).toBe(
      "Passwords do not match."
    );
    expect(validatePasswordUpdate("new-password", "new-password")).toBeNull();
  });

  it("recognizes only the exact password recovery destination", () => {
    expect(isPasswordRecoveryDestination("/auth?mode=reset")).toBe(true);
    expect(isPasswordRecoveryDestination("/auth?mode=signup")).toBe(false);
    expect(isPasswordRecoveryDestination("/auth?mode=reset&next=/dashboard")).toBe(false);
  });

  it("keeps the recovery marker short-lived and unavailable to browser scripts", () => {
    expect(passwordRecoveryCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/auth",
      maxAge: 15 * 60
    });
  });
});
