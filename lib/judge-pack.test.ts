import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { safeParseContributionPack } from "@/lib/imports/schemas";
import { assessPmClaim } from "@/lib/pm-verification";

const fixturePath = resolve(
  process.cwd(),
  "plugins/ledger-contribution/skills/ledger-contribution-pack/references/judge-pack.fixture.json"
);

describe("judge Contribution Pack fixture", () => {
  it("is valid and demonstrates every PM Agent outcome", () => {
    const parsed = safeParseContributionPack(JSON.parse(readFileSync(fixturePath, "utf8")));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const decisions = parsed.data.claims.map((claim) =>
      assessPmClaim({
        category: claim.category,
        evidenceRefs: claim.evidence_refs,
        evidence: parsed.data.evidence,
        uncertainty: claim.uncertainty
      }).decision
    );

    expect(decisions).toEqual([
      "agent_verified",
      "needs_review",
      "insufficient_evidence"
    ]);
  });
});
