export const HOME_WORKFLOW_STAGES = [
  {
    label: "Selected evidence",
    description: "Choose the work that supports the contribution."
  },
  {
    label: "Contribution draft",
    description: "Describe impact and link to supporting evidence."
  },
  {
    label: "PM Agent check",
    description: "AI provides an advisory confidence assessment."
  },
  {
    label: "Peer confirmation",
    description: "Another team member reviews and confirms."
  }
] as const;

export const HOME_RECORD = {
  title: "Launch narrative and demo flow",
  contributor: "Alex Rivera",
  reviewer: "Taylor Chen",
  status: "Ready for peer review",
  evidenceHash: "a7f3c9e2b4d18c7e9a6f0d3b2c1e8f7a9d4b2c1e3f6a7b8c5d0e9f4a1b6c8d2e"
} as const;

export function getHomePrimaryAction(signedIn: boolean) {
  return signedIn
    ? { href: "/dashboard", label: "Open dashboard" }
    : { href: "/auth", label: "Start a ledger" };
}
