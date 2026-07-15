export const PM_POLICY_VERSION = "pm-demo-v1" as const

export type PmVerificationDecision =
  | "agent_verified"
  | "needs_review"
  | "insufficient_evidence"

export type PmVerificationCheck = {
  id:
    | "evidence_linked"
    | "references_resolved"
    | "verification_evidence"
    | "uncertainty_clear"
  passed: boolean
  explanation: string
}

export type PmAssessmentResult = {
  decision: PmVerificationDecision
  policy_version: typeof PM_POLICY_VERSION
  checks: PmVerificationCheck[]
  summary: string
}

export type PmAssessmentInput = {
  category: string
  evidenceRefs: string[]
  evidence: Array<{
    ref: string
    kind: string
    summary?: string
  }>
  uncertainty?: string
  confidence?: number
}

export type PmDecisionPresentation = {
  label: string
  tone: "success" | "warning" | "neutral"
}

const DECISION_PRESENTATIONS: Record<
  PmVerificationDecision,
  PmDecisionPresentation
> = {
  agent_verified: { label: "Agent Verified", tone: "success" },
  needs_review: { label: "Needs Review", tone: "warning" },
  insufficient_evidence: {
    label: "Insufficient Evidence",
    tone: "neutral",
  },
}

const SUMMARIES: Record<PmVerificationDecision, string> = {
  agent_verified:
    "Selected evidence passes the Demo PM Agent policy. Human confirmation is still required.",
  needs_review:
    "Selected evidence needs human judgment before attribution and impact are confirmed.",
  insufficient_evidence:
    "The claim does not include enough linked evidence for PM Agent pre-verification.",
}

export function pmDecisionPresentation(
  decision: PmVerificationDecision
): PmDecisionPresentation {
  return DECISION_PRESENTATIONS[decision]
}

export function assessPmClaim(input: PmAssessmentInput): PmAssessmentResult {
  const evidenceByRef = new Map(input.evidence.map((item) => [item.ref, item]))
  const selectedEvidence = input.evidenceRefs
    .map((ref) => evidenceByRef.get(ref))
    .filter((item): item is PmAssessmentInput["evidence"][number] => Boolean(item))

  const hasEvidence = input.evidenceRefs.length > 0 && selectedEvidence.length > 0
  const referencesResolved =
    input.evidenceRefs.length > 0 && selectedEvidence.length === input.evidenceRefs.length
  const uncertaintyClear = !input.uncertainty?.trim()
  const verificationEvidenceSatisfied =
    input.category !== "code" || selectedEvidence.some((item) => item.kind === "test")

  const checks: PmVerificationCheck[] = [
    {
      id: "evidence_linked",
      passed: hasEvidence,
      explanation: hasEvidence
        ? "The claim links at least one selected evidence item."
        : "No selected evidence item supports this claim.",
    },
    {
      id: "references_resolved",
      passed: referencesResolved,
      explanation: referencesResolved
        ? "Every claim reference resolves inside the validated Contribution Pack."
        : "One or more claim references do not resolve inside the selected evidence.",
    },
    {
      id: "verification_evidence",
      passed: verificationEvidenceSatisfied,
      explanation:
        input.category !== "code"
          ? "A test evidence item is not required for this contribution category."
          : verificationEvidenceSatisfied
            ? "The code claim includes linked test evidence."
            : "Code claims require linked test evidence for Agent Verified.",
    },
    {
      id: "uncertainty_clear",
      passed: uncertaintyClear,
      explanation: uncertaintyClear
        ? "The pack records no unresolved uncertainty for this claim."
        : "The pack records uncertainty that requires human judgment.",
    },
  ]

  let decision: PmVerificationDecision
  if (!hasEvidence) {
    decision = "insufficient_evidence"
  } else if (!referencesResolved || !uncertaintyClear || !verificationEvidenceSatisfied) {
    decision = "needs_review"
  } else {
    decision = "agent_verified"
  }

  return {
    decision,
    policy_version: PM_POLICY_VERSION,
    checks,
    summary: SUMMARIES[decision],
  }
}
