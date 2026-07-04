import type { CategoryWeight, Contribution, Impact } from "@/lib/types";

const IMPACT_BASE: Record<Impact, number> = { low: 10, medium: 20, high: 40 };

export function contributionPoints(
  contribution: Pick<Contribution, "status" | "final_impact" | "evidence_url" | "category">,
  weights: Map<string, number>
) {
  if (contribution.status !== "confirmed" && contribution.status !== "partial") return 0;
  if (!contribution.final_impact) return 0;

  let points = IMPACT_BASE[contribution.final_impact];
  if (contribution.status === "partial") points *= 0.5;
  if (contribution.evidence_url) points += 10;

  return points * (weights.get(contribution.category) ?? 1.0);
}

export function categoryWeightMap(weights: CategoryWeight[]) {
  return new Map(weights.map((weight) => [weight.category, Number(weight.weight)]));
}

export type ContributorScore = {
  key: string;
  label: string;
  points: number;
  discussionWeight: number;
  contributions: number;
};

export function calculateDiscussionWeights(
  contributions: Contribution[],
  categoryWeights: CategoryWeight[]
): ContributorScore[] {
  const weights = categoryWeightMap(categoryWeights);
  const grouped = new Map<string, { label: string; byMilestone: Map<string, number[]> }>();

  for (const contribution of contributions) {
    const rawPoints = contributionPoints(contribution, weights);
    if (rawPoints <= 0) continue;

    const key =
      contribution.contributor_type === "agent"
        ? `agent:${contribution.contributor_agent_id ?? contribution.contributor_label}`
        : `member:${contribution.contributor_member_id ?? contribution.contributor_label}`;
    const milestoneKey = contribution.milestone_id ?? "no-milestone";

    if (!grouped.has(key)) {
      grouped.set(key, { label: contribution.contributor_label, byMilestone: new Map() });
    }

    const entry = grouped.get(key)!;
    const points = entry.byMilestone.get(milestoneKey) ?? [];
    points.push(rawPoints);
    entry.byMilestone.set(milestoneKey, points);
  }

  const totals = Array.from(grouped.entries()).map(([key, entry]) => {
    let points = 0;
    let count = 0;

    for (const milestonePoints of entry.byMilestone.values()) {
      const sorted = milestonePoints.sort((a, b) => b - a);
      count += sorted.length;
      points += sorted.reduce((sum, point, index) => {
        return sum + point * Math.max(0.5, 1 - index * 0.1);
      }, 0);
    }

    return { key, label: entry.label, points, discussionWeight: 0, contributions: count };
  });

  const allPoints = totals.reduce((sum, row) => sum + row.points, 0);

  return totals
    .map((row) => ({
      ...row,
      discussionWeight: allPoints > 0 ? row.points / allPoints : 0
    }))
    .sort((a, b) => b.points - a.points);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
