import { reviewContribution } from "@/lib/actions";
import { ProjectNav } from "@/components/nav";
import { SubmitButton } from "@/components/submit-button";
import { ImportedEvidence } from "@/components/imported-evidence";
import { ActionNotice, Field, inputClass, PageShell, Panel, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Agent, Member } from "@/lib/types";
import type { Contribution } from "@/lib/types";
import { IMPACTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const [{ data: project }, { data: pending }, { data: members }, { data: agents }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", id).single(),
    supabase
      .from("contributions")
      .select("*")
      .eq("project_id", id)
      .eq("status", "pending_review")
      .order("created_at", { ascending: true }),
    supabase.from("project_members").select("*").eq("project_id", id),
    supabase.from("agent_registry").select("*").eq("project_id", id)
  ]);
  const currentMember = (members as Member[] | null)?.find(
    (member) => !member.is_demo && member.profile_id === userData.user?.id
  );
  const ownedAgentIds = new Set(
    ((agents ?? []) as Agent[])
      .filter((agent) => agent.owner_member_id === currentMember?.id)
      .map((agent) => agent.id)
  );
  const visiblePending = ((pending ?? []) as Contribution[]).filter((contribution) => {
    if (!currentMember) return false;
    if (contribution.contributor_member_id === currentMember.id) return false;
    if (contribution.contributor_agent_id && ownedAgentIds.has(contribution.contributor_agent_id)) return false;
    return true;
  });
  const hiddenCount = ((pending ?? []) as Contribution[]).length - visiblePending.length;

  return (
    <PageShell title="Peer confirmation" eyebrow={project?.name}>
      <ProjectNav projectId={id} />
      <ActionNotice error={query.error} />
      <Panel title="Pending Review">
        {hiddenCount > 0 ? (
          <p className="mb-3 rounded-md border border-line bg-panel p-3 text-sm text-muted">
            {hiddenCount} pending record{hiddenCount === 1 ? "" : "s"} are hidden because contributors and
            agent owners cannot confirm their own work.
          </p>
        ) : null}
        <div className="grid gap-3">
          {visiblePending.length === 0 ? (
            <p className="text-sm text-muted">No pending contributions.</p>
          ) : (
            visiblePending.map((contribution) => (
              <div key={contribution.id} className="grid gap-4 rounded-md border border-line p-4">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={contribution.status} sample={contribution.is_demo} />
                      <span className="text-sm text-muted">{contribution.category.replaceAll("_", " ")}</span>
                    </div>
                    <h2 className="font-semibold">{contribution.description}</h2>
                    <p className="text-sm text-muted">
                      Contributor: {contribution.contributor_label} · Suggested impact:{" "}
                      {contribution.proposed_impact ?? "not set"}
                    </p>
                    {contribution.evidence_url ? (
                      <a
                        className="text-sm font-medium text-accent"
                        href={contribution.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Evidence link
                      </a>
                    ) : null}
                  </div>
                </div>

                <ImportedEvidence
                  packId={contribution.import_pack_id}
                  claimId={contribution.import_claim_id}
                  packHash={contribution.import_pack_hash}
                  provenance={contribution.import_provenance}
                />

                <form action={reviewContribution} className="grid gap-3 md:grid-cols-[160px_160px_1fr_auto]">
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="contribution_id" value={contribution.id} />
                  <Field label="Decision">
                    <select className={inputClass} name="status" defaultValue="confirmed">
                      <option value="confirmed">confirmed</option>
                      <option value="partial">partial</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </Field>
                  <Field label="Final impact">
                    <select className={inputClass} name="final_impact" defaultValue="medium">
                      {IMPACTS.map((impact) => (
                        <option key={impact} value={impact}>
                          {impact}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Review note">
                    <input className={inputClass} name="review_note" />
                  </Field>
                  <SubmitButton
                    className="focus-ring mt-6 min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    pendingLabel="Submitting..."
                  >
                    Submit
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </Panel>
    </PageShell>
  );
}
