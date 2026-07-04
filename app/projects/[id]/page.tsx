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

  return (
    <PageShell
      title={(project as Project).name}
      eyebrow={(project as Project).is_demo ? "Sample data project" : "Contribution Evidence"}
      actions={<LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>}
    >
      <ProjectNav projectId={id} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Members">
          <p className="text-3xl font-semibold">{(members as Member[] | null)?.length ?? 0}</p>
          <p className="text-sm text-muted">Authenticated members and clearly labeled sample members.</p>
        </Panel>
        <Panel title="Milestones">
          <p className="text-3xl font-semibold">{(milestones as Milestone[] | null)?.length ?? 0}</p>
          <p className="text-sm text-muted">Contribution scoring applies diminishing returns per milestone.</p>
        </Panel>
        <Panel title="Confirmed records">
          <p className="text-3xl font-semibold">{(contributions as Contribution[] | null)?.length ?? 0}</p>
          <p className="text-sm text-muted">Confirmed or partial rows include a server-side Evidence Hash.</p>
        </Panel>
      </div>

      <Panel title="Recent confirmed contributions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-3">Contribution</th>
                <th className="py-2 pr-3">Contributor</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Impact</th>
                <th className="py-2 pr-3">Evidence Hash</th>
              </tr>
            </thead>
            <tbody>
              {(contributions as Contribution[] | null)?.map((contribution) => (
                <tr key={contribution.id} className="border-b border-line">
                  <td className="py-3 pr-3">{contribution.description}</td>
                  <td className="py-3 pr-3">{contribution.contributor_label}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={contribution.status} sample={contribution.is_demo} />
                  </td>
                  <td className="py-3 pr-3">{contribution.final_impact ?? "n/a"}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-muted">
                    {contribution.evidence_hash?.slice(0, 16) ?? "pending"}
                  </td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  );
}
