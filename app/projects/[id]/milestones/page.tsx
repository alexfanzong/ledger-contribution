import { createMilestone } from "@/lib/actions";
import { ProjectNav } from "@/components/nav";
import { SubmitButton } from "@/components/submit-button";
import { ActionNotice, Field, inputClass, PageShell, Panel, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Milestone } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MilestonesPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: project }, { data: milestones }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase.from("milestones").select("*").eq("project_id", id).order("created_at", { ascending: false })
  ]);

  return (
    <PageShell title="Milestones" eyebrow={project?.name}>
      <ProjectNav projectId={id} />
      <ActionNotice error={query.error} />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1fr]">
        <Panel title="Create milestone">
          <form action={createMilestone} className="grid gap-3">
            <input type="hidden" name="project_id" value={id} />
            <Field label="Title">
              <input className={inputClass} name="title" required />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} name="description" rows={4} />
            </Field>
            <Field label="Target date">
              <input className={inputClass} name="target_date" type="date" />
            </Field>
            <SubmitButton
              className="focus-ring min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              pendingLabel="Adding..."
            >
              Add milestone
            </SubmitButton>
          </form>
        </Panel>

        <Panel title="Milestone list">
          <div className="grid gap-2">
            {(milestones as Milestone[] | null)?.map((milestone) => (
              <div key={milestone.id} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{milestone.title}</strong>
                  <StatusBadge status={milestone.status} />
                </div>
                <p className="text-sm text-muted">{milestone.description ?? "No description"}</p>
                {milestone.target_date ? (
                  <p className="mt-1 text-xs text-muted">Target: {milestone.target_date}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
