import { redirect } from "next/navigation";
import { ProjectNav } from "@/components/nav";
import { LinkButton, PageShell, Panel, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Contribution, Member, Milestone, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth");

  const [{ data: project, error: projectError }, { data: members }, { data: milestones }, { data: contributions }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("project_members").select("*").eq("project_id", id).order("created_at"),
      supabase.from("milestones").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase
        .from("contributions")
        .select("*")
        .eq("project_id", id)
        .in("status", ["confirmed", "partial"])
        .order("confirmed_at", { ascending: false })
        .limit(6)
    ]);

  if (projectError) throw new Error(projectError.message);

  const recentContributions = (contributions as Contribution[] | null) ?? [];
  const latestEvidenceHash = recentContributions.find((contribution) => contribution.evidence_hash)?.evidence_hash;

  return (
    <PageShell
      title={(project as Project).name}
      eyebrow={(project as Project).is_demo ? "Sample data project" : "Contribution Evidence"}
      actions={<LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>}
    >
      <ProjectNav projectId={id} />
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Members" className="border-t-2 border-t-plum-700">
          <p className="text-4xl font-semibold tracking-[-0.04em] text-ledger-ink">{(members as Member[] | null)?.length ?? 0}</p>
          <p className="mt-2 text-xs leading-5 text-ledger-muted">Authenticated members and clearly labeled sample members.</p>
        </Panel>
        <Panel title="Milestones" className="border-t-2 border-t-plum-400">
          <p className="text-4xl font-semibold tracking-[-0.04em] text-ledger-ink">{(milestones as Milestone[] | null)?.length ?? 0}</p>
          <p className="mt-2 text-xs leading-5 text-ledger-muted">Contribution scoring applies diminishing returns per milestone.</p>
        </Panel>
        <Panel title="Confirmed records" className="border-t-2 border-t-emerald-500">
          <p className="text-4xl font-semibold tracking-[-0.04em] text-ledger-ink">{recentContributions.length}</p>
          <p className="mt-2 text-xs leading-5 text-ledger-muted">Confirmed or partial rows include a server-side Evidence Hash.</p>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <Panel title="Recent confirmed contributions">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[780px]">
              <thead>
                <tr>
                  <th>Contribution</th>
                  <th>Contributor</th>
                  <th>Status</th>
                  <th>Impact</th>
                  <th>Evidence Hash</th>
                </tr>
              </thead>
              <tbody>
                {recentContributions.length ? (
                  recentContributions.map((contribution) => (
                    <tr key={contribution.id}>
                      <td className="max-w-[300px] font-medium">{contribution.description}</td>
                      <td>{contribution.contributor_label}</td>
                      <td>
                        <StatusBadge status={contribution.status} sample={contribution.is_demo} />
                      </td>
                      <td className="capitalize">{contribution.final_impact ?? "n/a"}</td>
                      <td className="font-mono text-xs text-ledger-muted">
                        {contribution.evidence_hash?.slice(0, 16) ?? "pending"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-ledger-muted">No confirmed contributions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Evidence integrity" className="bg-ledger-panel/70">
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-plum-700">Hash receipt</p>
              <p className="mt-2 text-sm leading-6 text-ledger-muted">
                Confirmed and partial records receive a server-side Evidence Hash for tamper-evident review.
              </p>
            </div>
            <div className="rounded-md border border-ledger-line bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ledger-muted">Latest receipt</p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-ledger-ink">
                {latestEvidenceHash ? `${latestEvidenceHash.slice(0, 24)}…` : "No confirmed hash yet"}
              </p>
            </div>
            <p className="text-xs leading-5 text-ledger-muted">
              This workspace supports non-binding discussion weight only; it does not create or allocate legal equity.
            </p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
