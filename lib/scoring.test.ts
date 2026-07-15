import { describe, expect, it } from "vitest";
import {
  calculateDiscussionWeights,
  contributionPoints,
  supersededIds
} from "@/lib/scoring";
import type { Contribution } from "@/lib/types";

let counter = 0;

function makeContribution(overrides: Partial<Contribution>): Contribution {
  counter += 1;
  return {
    id: `c-${counter}`,
    project_id: "p-1",
    milestone_id: "m-1",
    task_id: null,
    contributor_type: "human",
    contributor_member_id: "member-a",
    contributor_agent_id: null,
    contributor_label: "Member A",
    category: "code",
    description: "test contribution",
    evidence_url: null,
    proposed_impact: "medium",
    status: "confirmed",
    reviewer_member_id: "member-b",
    final_impact: "medium",
    review_note: null,
    confirmed_at: "2026-06-12T00:00:00Z",
    evidence_hash: "hash",
    evidence_hash_version: null,
    import_schema_version: null,
    import_pack_id: null,
    import_claim_id: null,
    import_pack_hash: null,
    import_claim_hash: null,
    import_provenance: null,
    supersedes_id: null,
    is_demo: false,
    created_at: "2026-06-12T00:00:00Z",
    ...overrides
  };
}

const noWeights = new Map<string, number>();

describe("contributionPoints", () => {
  it("scores impact base values", () => {
    expect(contributionPoints(makeContribution({ final_impact: "low" }), noWeights)).toBe(10);
    expect(contributionPoints(makeContribution({ final_impact: "medium" }), noWeights)).toBe(20);
    expect(contributionPoints(makeContribution({ final_impact: "high" }), noWeights)).toBe(40);
  });

  it("returns 0 for rejected and pending records", () => {
    expect(contributionPoints(makeContribution({ status: "rejected" }), noWeights)).toBe(0);
    expect(contributionPoints(makeContribution({ status: "pending_review" }), noWeights)).toBe(0);
  });

  it("halves the base for partial before the evidence bonus", () => {
    const partial = makeContribution({
      status: "partial",
      final_impact: "high",
      evidence_url: "https://example.com"
    });
    expect(contributionPoints(partial, noWeights)).toBe(30); // 40 * 0.5 + 10
  });

  it("applies category weights as a multiplier", () => {
    const weighted = new Map([["code", 2.0]]);
    expect(contributionPoints(makeContribution({ final_impact: "low" }), weighted)).toBe(20);
  });
});

describe("supersededIds", () => {
  it("collects ids superseded by confirmed or partial corrections", () => {
    const original = makeContribution({});
    const correction = makeContribution({ supersedes_id: original.id });
    expect(supersededIds([original, correction]).has(original.id)).toBe(true);
  });

  it("ignores corrections that are pending or rejected", () => {
    const original = makeContribution({});
    const pending = makeContribution({ supersedes_id: original.id, status: "pending_review" });
    const rejected = makeContribution({ supersedes_id: original.id, status: "rejected" });
    expect(supersededIds([original, pending, rejected]).size).toBe(0);
  });
});

describe("calculateDiscussionWeights", () => {
  it("does not double-count superseded records", () => {
    const original = makeContribution({ final_impact: "low" });
    const correction = makeContribution({ supersedes_id: original.id, final_impact: "medium" });
    const rows = calculateDiscussionWeights([original, correction], []);

    expect(rows).toHaveLength(1);
    expect(rows[0].contributions).toBe(1);
    expect(rows[0].points).toBe(20); // only the correction scores
  });

  it("applies diminishing returns within a milestone", () => {
    const contributions = [
      makeContribution({ final_impact: "high" }),
      makeContribution({ final_impact: "medium" }),
      makeContribution({ final_impact: "low" })
    ];
    const rows = calculateDiscussionWeights(contributions, []);
    // 40 * 1.0 + 20 * 0.9 + 10 * 0.8 = 66
    expect(rows[0].points).toBe(66);
  });

  it("floors the diminishing multiplier at 0.5", () => {
    const contributions = Array.from({ length: 8 }, () =>
      makeContribution({ final_impact: "low" })
    );
    const rows = calculateDiscussionWeights(contributions, []);
    // 10 * (1.0 + 0.9 + 0.8 + 0.7 + 0.6 + 0.5 + 0.5 + 0.5) = 55
    expect(rows[0].points).toBe(55);
  });

  it("groups no-milestone records into one shared bucket", () => {
    const contributions = [
      makeContribution({ milestone_id: null, final_impact: "medium" }),
      makeContribution({ milestone_id: null, final_impact: "medium" })
    ];
    const rows = calculateDiscussionWeights(contributions, []);
    // 20 * 1.0 + 20 * 0.9 = 38, not 40
    expect(rows[0].points).toBe(38);
  });

  it("normalizes discussion weight across contributors", () => {
    const contributions = [
      makeContribution({ final_impact: "high", contributor_member_id: "member-a", contributor_label: "A" }),
      makeContribution({ final_impact: "low", contributor_member_id: "member-b", contributor_label: "B" })
    ];
    const rows = calculateDiscussionWeights(contributions, []);
    expect(rows[0].discussionWeight).toBeCloseTo(0.8);
    expect(rows[1].discussionWeight).toBeCloseTo(0.2);
  });

  it("keys agent contributions separately from their owner", () => {
    const contributions = [
      makeContribution({ final_impact: "medium" }),
      makeContribution({
        contributor_type: "agent",
        contributor_member_id: null,
        contributor_agent_id: "agent-1",
        contributor_label: "Agent One",
        final_impact: "medium"
      })
    ];
    const rows = calculateDiscussionWeights(contributions, []);
    expect(rows).toHaveLength(2);
  });
});
