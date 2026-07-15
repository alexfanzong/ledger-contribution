import type { ContributionAgentVerification } from "@/lib/types"

const DECISIONS = new Set([
  "agent_verified",
  "needs_review",
  "insufficient_evidence",
])

const CHECK_IDS = new Set([
  "evidence_linked",
  "references_resolved",
  "verification_evidence",
  "uncertainty_clear",
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_PATTERN = /^[0-9a-f]{64}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max
}

export function readPmAgentVerification(
  value: unknown
): ContributionAgentVerification | null {
  if (!isRecord(value)) return null
  if (!boundedString(value.id, 36, 36) || !UUID_PATTERN.test(value.id)) return null
  if (
    !boundedString(value.project_id, 36, 36) ||
    !UUID_PATTERN.test(value.project_id)
  ) return null
  if (
    !boundedString(value.contribution_id, 36, 36) ||
    !UUID_PATTERN.test(value.contribution_id)
  ) return null
  if (typeof value.decision !== "string" || !DECISIONS.has(value.decision)) return null
  if (value.policy_version !== "pm-demo-v1") return null
  if (value.verifier_kind !== "deterministic_demo_pm_agent") return null
  if (!boundedString(value.summary, 1, 1000)) return null
  if (
    !boundedString(value.input_fingerprint, 64, 64) ||
    !SHA256_PATTERN.test(value.input_fingerprint)
  ) return null
  if (
    !boundedString(value.evaluated_at, 20, 40) ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.evaluated_at) ||
    Number.isNaN(Date.parse(value.evaluated_at))
  ) return null
  if (!Array.isArray(value.checks) || value.checks.length < 1 || value.checks.length > 10) {
    return null
  }

  const checks: ContributionAgentVerification["checks"] = []
  for (const check of value.checks) {
    if (!isRecord(check)) return null
    if (typeof check.id !== "string" || !CHECK_IDS.has(check.id)) return null
    if (typeof check.passed !== "boolean") return null
    if (!boundedString(check.explanation, 1, 500)) return null

    checks.push({
      id: check.id as ContributionAgentVerification["checks"][number]["id"],
      passed: check.passed,
      explanation: check.explanation,
    })
  }

  return {
    id: value.id,
    project_id: value.project_id,
    contribution_id: value.contribution_id,
    decision: value.decision as ContributionAgentVerification["decision"],
    policy_version: "pm-demo-v1",
    verifier_kind: "deterministic_demo_pm_agent",
    checks,
    summary: value.summary,
    input_fingerprint: value.input_fingerprint,
    evaluated_at: value.evaluated_at,
  }
}
