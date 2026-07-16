import { createAgent, createInvitation } from "@/lib/actions";
import { ProjectNav } from "@/components/nav";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { ActionNotice, Field, inputClass, PageShell, Panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import type { Agent, Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host = headerStore.get("host") ?? "127.0.0.1:3003";
  const origin = `${proto}://${host}`;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const [{ data: project }, { data: members }, { data: invitations }, { data: agents }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase.from("project_members").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("project_invitations")
      .select("*")
      .eq("project_id", id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("agent_registry").select("*").eq("project_id", id).order("created_at")
  ]);
  const currentMember = (members as Member[] | null)?.find(
    (member) => !member.is_demo && member.profile_id === userData.user?.id
  );

  return (
    <PageShell title="Members" eyebrow={project?.name}>
      <ProjectNav projectId={id} />
      <ActionNotice error={query.error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4">
          <Panel title="Project members">
            <div className="grid gap-2">
              {(members as Member[] | null)?.map((member) => (
                <div
                  key={member.id}
                  className="grid gap-1 rounded-md border border-line p-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <strong>{member.display_name}</strong>
                    <p className="text-sm text-muted">{member.email ?? "Sample data member"}</p>
                  </div>
                  <span className="text-sm font-medium text-muted">
                    {member.role}
                    {member.is_demo ? " · Sample data" : ""}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Registered agents">
            <div className="grid gap-3">
              {(agents as Agent[] | null)?.length ? (
                (agents as Agent[]).map((agent) => {
                  const owner = (members as Member[] | null)?.find((member) => member.id === agent.owner_member_id);
                  return (
                    <div key={agent.id} className="rounded-md border border-line p-3">
                      <strong>{agent.name}</strong>
                      <p className="text-sm text-muted">
                        {agent.agent_type ?? "agent"} · owner: {owner?.display_name ?? "unknown"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">
                  No registered agents yet. Register one to log work on behalf of an AI agent.
                </p>
              )}
              <form action={createAgent} className="grid gap-3 border-t border-line pt-3">
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="owner_member_id" value={currentMember?.id ?? ""} />
                <Field label="Agent name">
                  <input className={inputClass} name="name" placeholder="Research Agent A" required />
                </Field>
                <Field label="Agent type">
                  <input className={inputClass} name="agent_type" placeholder="research, coding, analyst" />
                </Field>
                <SubmitButton
                  className="focus-ring min-h-10 rounded-md bg-plum-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!currentMember}
                  pendingLabel="Registering..."
                >
                  Register agent
                </SubmitButton>
              </form>
            </div>
          </Panel>
        </div>

        <Panel title="Invite by email">
          <form action={createInvitation} className="grid gap-3">
            <input type="hidden" name="project_id" value={id} />
            <Field label="Email">
              <input className={inputClass} name="email" type="email" required />
            </Field>
            <Field label="Role">
              <select className={inputClass} name="role" defaultValue="member">
                <option value="member">member</option>
                <option value="reviewer">reviewer</option>
                <option value="owner">owner</option>
              </select>
            </Field>
            <SubmitButton
              className="focus-ring min-h-10 rounded-md bg-plum-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
              pendingLabel="Creating..."
            >
              Create invitation
            </SubmitButton>
          </form>

          <div className="mt-5 grid gap-2">
            <h3 className="text-sm font-semibold">Pending invitations</h3>
            {(invitations ?? []).length === 0 ? (
              <p className="text-sm text-muted">No pending invitations.</p>
            ) : (
              invitations?.map((invite) => (
                <div key={invite.id} className="rounded-md border border-line p-3 text-sm">
                  <strong>{invite.email}</strong>
                  <p className="text-muted">Role: {invite.role}</p>
                  <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                    <p className="break-all rounded-md bg-panel px-2 py-1 font-mono text-xs text-muted">
                      {origin}/invite/{invite.token}
                    </p>
                    <CopyButton value={`${origin}/invite/${invite.token}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
