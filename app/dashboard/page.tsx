import Link from "next/link";
import { redirect } from "next/navigation";
import { createSampleProject } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { LinkButton, PageShell, Panel } from "@/components/ui";
import { SignOutButton } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <PageShell
      title="Projects"
      eyebrow={userData.user.email ?? undefined}
      actions={
        <>
          <LinkButton href="/projects/new">New project</LinkButton>
          <form action={createSampleProject}>
            <SubmitButton
              className="focus-ring min-h-9 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-gray-100"
              pendingLabel="Creating..."
            >
              Create sample project
            </SubmitButton>
          </form>
          <SignOutButton />
        </>
      }
    >
      <Panel title="Your contribution ledgers">
        <div className="grid gap-2">
          {(projects as Project[]).length === 0 ? (
            <p className="text-sm text-muted">
              No projects yet. Create a real project or generate sample data to understand the flow.
            </p>
          ) : (
            (projects as Project[]).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="grid gap-1 rounded-md border border-line p-3 transition hover:bg-panel"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{project.name}</strong>
                  {project.is_demo ? (
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Sample data
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{project.description ?? "No description"}</p>
              </Link>
            ))
          )}
        </div>
      </Panel>
    </PageShell>
  );
}
