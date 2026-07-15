import { describe, expect, it } from "vitest"

import type { ContributionPack } from "@/lib/imports/schemas"
import { prepareContributionClaimImport } from "@/lib/imports/prepare"

const pack: ContributionPack = {
  schema_version: "1.0",
  pack_id: "pack-ledger-import",
  project_name: "Contribution Ledger",
  period: { start: "2026-07-14", end: "2026-07-15" },
  contributor_hint: { type: "human", display_name: "Alex Fan" },
  evidence: [
    {
      ref: "commit:004cd08",
      kind: "commit",
      title: "Contribution Pack contract",
      summary: "Added deterministic validation and tests.",
    },
  ],
  claims: [
    {
      claim_id: "claim:contract",
      category: "code",
      description: "Implemented the Contribution Pack contract.",
      proposed_impact: "medium",
      evidence_refs: ["commit:004cd08"],
    },
  ],
  generated_by: {
    tool: "codex",
    generated_at: "2026-07-15T04:00:00.000Z",
  },
}

const actor = {
  project: { id: "project-1", name: "Contribution Ledger" },
  member: { id: "member-1", display_name: "Alex Fan" },
  owned_agents: [{ id: "agent-1", name: "Codex" }],
}

describe("prepareContributionClaimImport", () => {
  it("creates bounded RPC input from a valid edited claim", () => {
    const result = prepareContributionClaimImport({
      pack,
      actor,
      claimId: "claim:contract",
      edits: {
        category: "architecture",
        description: "Defined a portable and deterministic import boundary.",
        proposedImpact: "high",
        milestoneId: "milestone-1",
      },
    })

    expect(result).toEqual({
      success: true,
      data: {
        project_id: "project-1",
        pack,
        claim_id: "claim:contract",
        category: "architecture",
        description: "Defined a portable and deterministic import boundary.",
        proposed_impact: "high",
        milestone_id: "milestone-1",
        contributor_agent_id: null,
      },
    })
  })

  it("rejects an unknown claim id", () => {
    const result = prepareContributionClaimImport({
      pack,
      actor,
      claimId: "claim:missing",
      edits: {
        category: "code",
        description: "Description",
        proposedImpact: "medium",
        milestoneId: null,
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.issues[0].code).toBe("CLAIM_NOT_FOUND")
  })

  it("rejects edited fields outside the Contribution Pack contract", () => {
    const result = prepareContributionClaimImport({
      pack,
      actor,
      claimId: "claim:contract",
      edits: {
        category: "unsupported",
        description: "",
        proposedImpact: "critical",
        milestoneId: null,
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(["INVALID_CATEGORY", "INVALID_LENGTH", "INVALID_IMPACT"])
      )
    }
  })
})
