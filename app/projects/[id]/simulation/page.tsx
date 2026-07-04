import { LEGAL_DISCLAIMER } from "@/components/legal-footer";
import { ProjectNav } from "@/components/nav";
import { PageShell, Panel, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  calculateDiscussionWeights,
  contributionPoints,
  formatPercent,
  categoryWeightMap,
  supersededIds
} from "@/lib/scoring";
import type { CategoryWeight, Contribution } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: contributions }, { data: categoryWeights }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase.from("contributions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("category_weights").select("category, weight").eq("project_id", id)
  ]);

  const rows = calculateDiscussionWeights(
    (contributions ?? []) as Contribution[],
    (categoryWeights ?? []) as CategoryWeight[]
  );
  const weights = categoryWeightMap((categoryWeights ?? []) as CategoryWeight[]);
  const superseded = supersededIds((contributions ?? []) as Contribution[]);

  return (
    <PageShell title="Non-Binding Simulation" eyebrow={project?.name}>
      <ProjectNav projectId={id} />
      <Panel>
        <p className="text-sm font-medium text-ink">Non-binding discussion weight — not legal equity ownership.</p>
        <p className="mt-1 text-sm leading-6 text-muted">{LEGAL_DISCLAIMER}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Records without a milestone are grouped into one no-milestone bucket, so they still receive
          the same per-contributor diminishing returns.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Discussion Weight">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3">Contributor</th>
                  <th className="py-2 pr-3">Labor points</th>
                  <th className="py-2 pr-3">Records</th>
                  <th className="py-2 pr-3">Discussion Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-line">
                    <td className="py-3 pr-3 font-medium">{row.label}</td>
                    <td className="py-3 pr-3">{row.points.toFixed(1)}</td>
                    <td className="py-3 pr-3">{row.contributions}</td>
                    <td className="py-3 pr-3 font-semibold">{formatPercent(row.discussionWeight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Scored contribution records">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3">Contribution</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Impact</th>
                  <th className="py-2 pr-3">Points before diminishing returns</th>
                </tr>
              </thead>
              <tbody>
                {((contributions ?? []) as Contribution[]).map((contribution) => {
                  const isSuperseded = superseded.has(contribution.id);
                  return (
                    <tr
                      key={contribution.id}
                      className={`border-b border-line ${isSuperseded ? "text-muted line-through decoration-gray-400" : ""}`}
                    >
                      <td className="py-3 pr-3">{contribution.description}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge
                          status={isSuperseded ? "superseded" : contribution.status}
                          sample={contribution.is_demo}
                        />
                      </td>
                      <td className="py-3 pr-3">{contribution.final_impact ?? "n/a"}</td>
                      <td className="py-3 pr-3">
                        {isSuperseded ? "0.0" : contributionPoints(contribution, weights).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
