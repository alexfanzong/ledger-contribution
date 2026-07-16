export type AuthMode = "signin" | "signup";

export function getFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getAuthMode(value: string | string[] | undefined): AuthMode {
  const mode = getFirstQueryValue(value);
  return mode === "signup" ? "signup" : "signin";
}

export function buildAuthErrorPath(mode: AuthMode, message: string) {
  const params = new URLSearchParams();
  if (mode === "signup") params.set("mode", "signup");
  params.set("error", message);
  return `/auth?${params.toString()}`;
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
