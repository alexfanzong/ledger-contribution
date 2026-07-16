import { describe, expect, it } from "vitest";

import {
  preverifyContributionPack,
  validateContributionPack,
} from "@/lib/mcp-tools";

const validPack = {
  schema_version: "1.0",
  pack_id: "pack-ledger-mcp-test",
  project_name: "Ledger",
  period: { start: "2026-07-14", end: "2026-07-16" },
  contributor_hint: { type: "human", display_name: "Alex Rivera" },
  evidence: [
    {
      ref: "commit:abc1234",
      kind: "commit",
      uri: "git:commit:abc1234",
      title: "Implement MCP tools",
      summary: "Adds the bounded MCP tool surface.",
    },
    {
      ref: "test:mcp",
      kind: "test",
      title: "MCP tool tests",
      summary: "Validates tool outputs and PM policy behavior.",
    },
  ],
  claims: [
    {
      claim_id: "claim:mcp-tools",
      category: "code",
      description: "Implemented the Ledger MCP tool surface.",
      proposed_impact: "medium",
      evidence_refs: ["commit:abc1234", "test:mcp"],
    },
  ],
  generated_by: {
    tool: "codex",
    model: "gpt-5.6",
    generated_at: "2026-07-16T09:00:00.000Z",
  },
} as const;

describe("Ledger MCP tool core", () => {
  it("returns a compact summary for a valid Contribution Pack", () => {
    const result = validateContributionPack(validPack);

    expect(result).toMatchObject({
      valid: true,
      schema_version: "1.0",
      pack_id: "pack-ledger-mcp-test",
      project_name: "Ledger",
      claim_count: 1,
      evidence_count: 2,
    });
  });

  it("returns structured issues instead of throwing for invalid input", () => {
    const result = validateContributionPack({ schema_version: "99" });

    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("Expected invalid pack result");
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ code: expect.any(String), path: expect.any(String) })
    );
  });

  it("runs the advisory PM policy without changing or confirming claims", () => {
    const result = preverifyContributionPack(validPack);

    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("Expected valid pack result");
    expect(result.human_confirmation_required).toBe(true);
    expect(result.assessments).toHaveLength(1);
    expect(result.assessments[0]).toMatchObject({
      claim_id: "claim:mcp-tools",
      decision: "agent_verified",
      policy_version: "pm-demo-v1",
    });
    expect(result).not.toHaveProperty("confirmed");
    expect(result).not.toHaveProperty("evidence_hash");
  });
});
