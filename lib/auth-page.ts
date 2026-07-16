export type AuthMode = "signin" | "signup" | "forgot" | "reset";
export const PASSWORD_RECOVERY_COOKIE = "ledger-password-recovery";

export function getFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getAuthMode(value: string | string[] | undefined): AuthMode {
  const mode = getFirstQueryValue(value);
  return mode === "signup" || mode === "forgot" || mode === "reset" ? mode : "signin";
}

export function buildAuthErrorPath(mode: AuthMode, message: string) {
  return buildAuthNoticePath(mode, "error", message);
}

export function buildAuthMessagePath(mode: AuthMode, message: string) {
  return buildAuthNoticePath(mode, "message", message);
}

function buildAuthNoticePath(mode: AuthMode, key: "error" | "message", message: string) {
  const params = new URLSearchParams();
  if (mode !== "signin") params.set("mode", mode);
  params.set(key, message);
  return `/auth?${params.toString()}`;
}

export function buildPasswordRecoveryRedirect(origin: string) {
  const parsedOrigin = parseHttpOrigin(origin);

  const callback = new URL("/auth/callback", parsedOrigin.origin);
  callback.searchParams.set("next", "/auth?mode=reset");
  return callback.toString();
}

export function resolveAuthOrigin({
  configuredUrl,
  requestOrigin,
  requestHost
}: {
  configuredUrl: string | undefined;
  requestOrigin: string | null;
  requestHost: string | null;
}) {
  if (configuredUrl) return parseHttpOrigin(configuredUrl).origin;

  const parsedOrigin = parseHttpOrigin(requestOrigin ?? "http://localhost:3000");
  const expectedHost = requestHost?.split(",")[0]?.trim().toLowerCase();
  if (expectedHost && parsedOrigin.host.toLowerCase() !== expectedHost) {
    throw new Error("Password recovery origin does not match the request host");
  }

  return parsedOrigin.origin;
}

function parseHttpOrigin(value: string) {
  const parsedOrigin = new URL(value);
  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    throw new Error("Password recovery requires an HTTP or HTTPS origin");
  }
  return parsedOrigin;
}

export function validatePasswordUpdate(password: string, confirmation: string) {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

export function isPasswordRecoveryDestination(destination: string) {
  return destination === "/auth?mode=reset";
}

export function passwordRecoveryCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/auth",
    maxAge: 15 * 60
  };
}

export const AUTH_WORKFLOW_STAGES = [
  {
    label: "Selected evidence",
    description: "Attach the work that supports the contribution."
  },
  {
    label: "Contribution draft",
    description: "Record the scope, outcome, and proposed impact."
  },
  {
    label: "PM Agent check",
    description: "Advisory evidence check with an explainable confidence signal."
  },
  {
    label: "Peer confirmation",
    description: "A different human reviews and confirms the final record."
  }
] as const;
