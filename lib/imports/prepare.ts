import {
  safeParseContributionPack,
  type ContributionPack,
  type ContributionPackIssue,
} from "@/lib/imports/schemas"
import {
  validatePackForActor,
  type PackActorContext,
} from "@/lib/imports/validate"

export type ContributionClaimEdits = {
  category: string
  description: string
  proposedImpact: string
  milestoneId: string | null
}

export type PreparedContributionClaimImport = {
  project_id: string
  pack: ContributionPack
  claim_id: string
  category: ContributionPack["claims"][number]["category"]
  description: string
  proposed_impact: ContributionPack["claims"][number]["proposed_impact"]
  milestone_id: string | null
  contributor_agent_id: string | null
}

export type PrepareContributionClaimResult =
  | { success: true; data: PreparedContributionClaimImport }
  | { success: false; issues: ContributionPackIssue[] }

export function prepareContributionClaimImport({
  pack,
  actor,
  claimId,
  edits,
}: {
  pack: ContributionPack
  actor: PackActorContext
  claimId: string
  edits: ContributionClaimEdits
}): PrepareContributionClaimResult {
  const claim = pack.claims.find((candidate) => candidate.claim_id === claimId)
  if (!claim) {
    return {
      success: false,
      issues: [
        {
          code: "CLAIM_NOT_FOUND",
          path: "claim_id",
          message: "The selected claim does not exist in this Contribution Pack.",
        },
      ],
    }
  }

  const editedPack = {
    ...pack,
    claims: pack.claims.map((candidate) =>
      candidate.claim_id === claimId
        ? {
            ...candidate,
            category: edits.category,
            description: edits.description,
            proposed_impact: edits.proposedImpact,
          }
        : candidate
    ),
  }
  const editedPackResult = safeParseContributionPack(editedPack)
  if (!editedPackResult.success) return editedPackResult

  if (
    edits.milestoneId !== null &&
    (edits.milestoneId.length < 1 || edits.milestoneId.length > 100)
  ) {
    return {
      success: false,
      issues: [
        {
          code: "INVALID_MILESTONE_ID",
          path: "milestone_id",
          message: "Milestone id must be between 1 and 100 characters.",
        },
      ],
    }
  }

  const actorResult = validatePackForActor(pack, actor)
  if (!actorResult.success) return actorResult

  const editedClaim = editedPackResult.data.claims.find(
    (candidate) => candidate.claim_id === claimId
  )
  if (!editedClaim) {
    return {
      success: false,
      issues: [
        {
          code: "CLAIM_NOT_FOUND",
          path: "claim_id",
          message: "The selected claim does not exist in this Contribution Pack.",
        },
      ],
    }
  }

  return {
    success: true,
    data: {
      project_id: actor.project.id,
      pack,
      claim_id: claimId,
      category: editedClaim.category,
      description: editedClaim.description,
      proposed_impact: editedClaim.proposed_impact,
      milestone_id: edits.milestoneId,
      contributor_agent_id: actorResult.attribution.contributor_agent_id,
    },
  }
}
