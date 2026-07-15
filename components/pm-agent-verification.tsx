import {
  pmDecisionPresentation,
  type PmAssessmentResult,
} from "@/lib/pm-verification"
import type { ContributionAgentVerification } from "@/lib/types"

type DisplayAssessment = Pick<
  PmAssessmentResult,
  "decision" | "policy_version" | "checks" | "summary"
> & {
  uncertainty?: string | null
  input_fingerprint?: string
  evaluated_at?: string
}

const TONE_CLASSES = {
  success: "border-violet-200 bg-violet-50 text-violet-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  neutral: "border-gray-200 bg-gray-50 text-gray-800",
}

export function PmAgentVerification({
  verification,
  preview = false,
  compact = false,
}: {
  verification: DisplayAssessment | ContributionAgentVerification
  preview?: boolean
  compact?: boolean
}) {
  const presentation = pmDecisionPresentation(verification.decision)

  if (compact) {
    return (
      <div className="grid gap-1 text-xs">
        <span
          className={`inline-flex w-fit rounded-md border px-2 py-1 font-medium ${TONE_CLASSES[presentation.tone]}`}
        >
          {presentation.label}
        </span>
        <span className="text-muted">Demo PM Agent · human review required</span>
      </div>
    )
  }

  return (
    <section
      className={`grid gap-3 rounded-md border p-3 text-sm ${TONE_CLASSES[presentation.tone]}`}
      aria-label={preview ? "Demo PM Agent preview" : "Demo PM Agent assessment"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-current/20 bg-white/70 px-2 py-1 text-xs font-semibold">
          {presentation.label}
        </span>
        <span className="text-xs font-medium">Demo PM Agent</span>
        {preview ? <span className="text-xs uppercase tracking-wide">Preview</span> : null}
      </div>

      <p>{verification.summary}</p>
      {verification.uncertainty ? (
        <div className="rounded-md border border-current/20 bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Recorded uncertainty</p>
          <p className="mt-1 text-sm">{verification.uncertainty}</p>
        </div>
      ) : null}
      <p className="text-xs opacity-80">
        PM Agent checked whether the selected evidence supports progress. A teammate must still
        confirm who contributed and the final impact.
      </p>

      <details>
        <summary className="cursor-pointer text-xs font-medium">Verification details</summary>
        <div className="mt-2 grid gap-2">
          {verification.checks.map((check) => (
            <p key={check.id} className="text-xs">
              <span className="font-semibold">{check.passed ? "Pass" : "Review"}:</span>{" "}
              {check.explanation}
            </p>
          ))}
          <p className="font-mono text-[11px] opacity-75">
            Policy: {verification.policy_version}
          </p>
          {verification.input_fingerprint ? (
            <p
              className="font-mono text-[11px] opacity-75"
              title={verification.input_fingerprint}
            >
              Input fingerprint: {verification.input_fingerprint.slice(0, 18)}
            </p>
          ) : null}
          {verification.evaluated_at ? (
            <p className="text-[11px] opacity-75">
              Evaluated: {new Date(verification.evaluated_at).toLocaleString("en-US", {
                timeZone: "UTC",
              })} UTC
            </p>
          ) : null}
        </div>
      </details>
    </section>
  )
}
