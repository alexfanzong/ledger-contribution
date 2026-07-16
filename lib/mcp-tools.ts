import {
  safeParseContributionPack,
  type ContributionPackIssue,
} from "@/lib/imports/schemas";
import { assessPmClaim } from "@/lib/pm-verification";

export type ContributionPackValidation =
  | {
      valid: true;
      schema_version: "1.0";
      pack_id: string;
      project_name: string;
      contributor: { type: "human" | "agent"; display_name: string };
      period: { start: string; end: string };
      claim_count: number;
      evidence_count: number;
    }
  | {
      valid: false;
      issues: ContributionPackIssue[];
    };

export function validateContributionPack(
  input: unknown
): ContributionPackValidation {
  const parsed = safeParseContributionPack(input);

  if (!parsed.success) {
    return { valid: false, issues: parsed.issues };
  }

  return {
    valid: true,
    schema_version: parsed.data.schema_version,
    pack_id: parsed.data.pack_id,
    project_name: parsed.data.project_name,
    contributor: parsed.data.contributor_hint,
    period: parsed.data.period,
    claim_count: parsed.data.claims.length,
    evidence_count: parsed.data.evidence.length,
  };
}

export type ContributionPackPreverification =
  | {
      valid: true;
      pack_id: string;
      project_name: string;
      human_confirmation_required: true;
      assessments: Array<{
        claim_id: string;
        description: string;
        proposed_impact: "low" | "medium" | "high";
        decision: "agent_verified" | "needs_review" | "insufficient_evidence";
        policy_version: "pm-demo-v1";
        summary: string;
        checks: ReturnType<typeof assessPmClaim>["checks"];
      }>;
    }
  | {
      valid: false;
      issues: ContributionPackIssue[];
    };

export function preverifyContributionPack(
  input: unknown
): ContributionPackPreverification {
  const parsed = safeParseContributionPack(input);

  if (!parsed.success) {
    return { valid: false, issues: parsed.issues };
  }

  return {
    valid: true,
    pack_id: parsed.data.pack_id,
    project_name: parsed.data.project_name,
    human_confirmation_required: true,
    assessments: parsed.data.claims.map((claim) => {
      const assessment = assessPmClaim({
        category: claim.category,
        evidenceRefs: claim.evidence_refs,
        evidence: parsed.data.evidence,
        uncertainty: claim.uncertainty,
      });

      return {
        claim_id: claim.claim_id,
        description: claim.description,
        proposed_impact: claim.proposed_impact,
        decision: assessment.decision,
        policy_version: assessment.policy_version,
        summary: assessment.summary,
        checks: assessment.checks,
      };
    }),
  };
}
