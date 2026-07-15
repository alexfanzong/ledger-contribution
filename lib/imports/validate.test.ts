import { describe, expect, it } from "vitest"

import type { ContributionPack } from "@/lib/imports/schemas"
import {
  parseContributionPackText,
  validatePackForActor,
} from "@/lib/imports/validate"

const pack: ContributionPack = {
  schema_version: "1.0",
  pack_id: "pack-ledger-import",
  project_name: "Contribution Ledger",
  period: { start: "2026-07-14", end: "2026-07-15" },
  contributor_hint: { type: "human", display_name: "Alex Fan" },
  evidence: [
    {
      ref: "test:schemas",
      kind: "test",
      title: "Schema tests",
      summary: "Contribution Pack validation passes.",
    },
  ],
  claims: [
    {
      claim_id: "claim:schema",
      category: "code",
      description: "Implemented deterministic Contribution Pack validation.",
      proposed_impact: "medium",
      evidence_refs: ["test:schemas"],
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

function issueCodes(result: { success: boolean; issues?: Array<{ code: string }> }) {
  return result.success ? [] : (result.issues ?? []).map((issue) => issue.code)
}

describe("parseContributionPackText", () => {
  it("parses a schema-valid pack", () => {
    const result = parseContributionPackText(JSON.stringify(pack))

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(pack)
  })

  it("returns a stable error for invalid JSON", () => {
    const result = parseContributionPackText("{not json}")

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain("INVALID_JSON")
  })

  it("rejects text over the byte limit before parsing", () => {
    const result = parseContributionPackText("ééé", { maxBytes: 5 })

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain("PACK_TOO_LARGE")
  })
})

describe("validatePackForActor", () => {
  it("binds a human pack to the authenticated member, not a supplied id", () => {
    const result = validatePackForActor(pack, actor)

    expect(result).toEqual({
      success: true,
      attribution: {
        contributor_type: "human",
        contributor_member_id: "member-1",
        contributor_agent_id: null,
        contributor_label: "Alex Fan",
      },
    })
  })

  it("rejects a pack made for a different project", () => {
    const result = validatePackForActor(
      { ...pack, project_name: "Unrelated Project" },
      actor
    )

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain("PROJECT_MISMATCH")
  })

  it("rejects a human pack naming a different contributor", () => {
    const result = validatePackForActor(
      {
        ...pack,
        contributor_hint: { type: "human", display_name: "Another Member" },
      },
      actor
    )

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain("MEMBER_MISMATCH")
  })

  it("binds an agent pack only to an agent owned by the member", () => {
    const result = validatePackForActor(
      {
        ...pack,
        contributor_hint: { type: "agent", display_name: "Codex" },
      },
      actor
    )

    expect(result).toEqual({
      success: true,
      attribution: {
        contributor_type: "agent",
        contributor_member_id: null,
        contributor_agent_id: "agent-1",
        contributor_label: "Codex",
      },
    })
  })

  it("rejects an agent that the authenticated member does not own", () => {
    const result = validatePackForActor(
      {
        ...pack,
        contributor_hint: { type: "agent", display_name: "Unknown Agent" },
      },
      actor
    )

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain("AGENT_NOT_OWNED")
  })
})
