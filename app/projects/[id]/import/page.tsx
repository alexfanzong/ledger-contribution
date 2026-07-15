import { redirect } from "next/navigation";
import { ContributionPackImport } from "@/components/contribution-pack-import";
import { ProjectNav } from "@/components/nav";
import { ActionNotice, PageShell } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContributionPackImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/auth");

  const [{ data: project, error: projectError }, { data: currentMember }, { data: milestones }] =
    await Promise.all([
      supabase.from("projects").select("id, name").eq("id", id).single(),
      supabase
        .from("project_members")
        .select("id, display_name")
        .eq("project_id", id)
        .eq("profile_id", userData.user.id)
        .eq("is_demo", false)
        .single(),
      supabase
        .from("milestones")
        .select("id, title")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (projectError || !project) throw new Error("Project not found or unavailable.");
  if (!currentMember) redirect(`/projects/${id}/ledger?error=${encodeURIComponent("Current user is not a project member.")}`);

  const { data: ownedAgents } = await supabase
    .from("agent_registry")
    .select("id, name")
    .eq("project_id", id)
    .eq("owner_member_id", currentMember.id)
    .order("created_at");

  return (
    <PageShell title="Import Codex contribution pack" eyebrow={project.name}>
      <ProjectNav projectId={id} />
      <ActionNotice error={query.error} message={query.message} />
      <ContributionPackImport
        actor={{
          project,
          member: currentMember,
          owned_agents: ownedAgents ?? [],
        }}
        milestones={milestones ?? []}
      />
    </PageShell>
  );
}
