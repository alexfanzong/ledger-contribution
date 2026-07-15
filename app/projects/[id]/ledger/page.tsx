import { createContribution } from "@/lib/actions";
import { ProjectNav } from "@/components/nav";
import { SubmitButton } from "@/components/submit-button";
import { ImportedEvidence } from "@/components/imported-evidence";
import { PmAgentVerification } from "@/components/pm-agent-verification";
import { ActionNotice, Field, inputClass, PageShell, Panel, StatusBadge } from "@/components/ui";
import { readPmAgentVerification } from "@/lib/pm-verification-record";
import { supersededIds } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Agent, Contribution, ContributionAgentVerification, Member, Milestone } from "@/lib/types";
import { CONTRIBUTION_CATEGORIES, IMPACTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LedgerPage({
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
  const [{ data: project }, { data: members }, { data: milestones }, { data: contributions }, { data: agents }, { data: verifications }] =
    await Promise.all([
      supabase.from("projects").select("name").eq("id", id).single(),
      supabase.from("project_members").select("*").eq("project_id", id).order("created_at"),
      supabase.from("milestones").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("contributions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("agent_registry").select("*").eq("project_id", id).order("created_at"),
      supabase
        .from("contribution_agent_verifications")
        .select("*")
        .eq("project_id", id)
        .order("evaluated_at", { ascending: false })
    ]);

  const currentMember = (members as Member[] | null)?.find(
    (member) => !member.is_demo && member.profile_id === userData.user?.id
  );
  const latestVerificationByContribution = new Map<string, ContributionAgentVerification>();
  for (const value of verifications ?? []) {
    const verification = readPmAgentVerification(value);
    if (verification && !latestVerificationByContribution.has(verification.contribution_id)) {
      latestVerificationByContribution.set(verification.contribution_id, verification);
    }
  }
  const contributionRows = (contributions ?? []) as Contribution[];
  const supersededContributionIds = supersededIds(contributionRows);

  return (
    <PageShell title="Contribution ledger" eyebrow={project?.name}>
      <ProjectNav projectId={id} />
      <ActionNotice error={query.error} />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title="Log contribution">
          <form action={createContribution} className="grid gap-3">
            <input type="hidden" name="project_id" value={id} />
            <Field label="Contributor">
              <select className={inputClass} name="contributor_source" defaultValue={`member:${currentMember?.id ?? ""}`}>
                <option value={`member:${currentMember?.id ?? ""}`}>Myself ({currentMember?.display_name ?? "member"})</option>
                {(agents as Agent[] | null)
                  ?.filter((agent) => agent.owner_member_id === currentMember?.id)
                  .map((agent) => (
                    <option key={agent.id} value={`agent:${agent.id}`}>
                      On behalf of {agent.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Milestone">
              <select className={inputClass} name="milestone_id" defaultValue="">
                <option value="">No milestone</option>
                {(milestones as Milestone[] | null)?.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-muted">
                No milestone records share one scoring bucket and still receive diminishing returns.
              </span>
            </Field>
            <Field label="Category">
              <select className={inputClass} name="category" defaultValue="product">
                {CONTRIBUTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea className={inputClass} name="description" rows={4} required />
            </Field>
            <Field label="Evidence URL">
              <input className={inputClass} name="evidence_url" type="url" placeholder="https://..." />
            </Field>
            <Field label="Suggested impact">
              <select className={inputClass} name="proposed_impact" defaultValue="medium">
                {IMPACTS.map((impact) => (
                  <option key={impact} value={impact}>
                    {impact}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supersedes record">
              <select className={inputClass} name="supersedes_id" defaultValue="">
                <option value="">New record</option>
                {contributionRows
                  ?.filter((contribution) => contribution.status !== "pending_review")
                  .map((contribution) => (
                    <option key={contribution.id} value={contribution.id}>
                      {contribution.contributor_label}: {contribution.description.slice(0, 72)}
                    </option>
                  ))}
              </select>
            </Field>
            <SubmitButton
              className="focus-ring min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={!currentMember}
              pendingLabel="Submitting..."
            >
              Submit for peer confirmation
            </SubmitButton>
            {!currentMember ? (
              <p className="text-sm text-muted">Sample members cannot submit new real records.</p>
            ) : null}
          </form>
        </Panel>

        <Panel title="Ledger">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3">Contribution</th>
                  <th className="py-2 pr-3">Contributor</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Impact</th>
                  <th className="py-2 pr-3">Evidence Hash</th>
                  <th className="py-2 pr-3">Import source</th>
                  <th className="py-2 pr-3">PM Agent</th>
                  <th className="py-2 pr-3">Future verification</th>
                </tr>
              </thead>
              <tbody>
                {contributionRows.map((contribution) => {
                  const superseded = supersededContributionIds.has(contribution.id);
                  return (
                    <tr
                      key={contribution.id}
                      className={`border-b border-line ${superseded || contribution.status === "rejected" ? "text-muted line-through decoration-gray-400" : ""}`}
                    >
                      <td className="py-3 pr-3">{contribution.description}</td>
                      <td className="py-3 pr-3">{contribution.contributor_label}</td>
                      <td className="py-3 pr-3">{contribution.category.replaceAll("_", " ")}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge
                          status={superseded ? "superseded" : contribution.status}
                          sample={contribution.is_demo}
                        />
                      </td>
                      <td className="py-3 pr-3">{contribution.final_impact ?? contribution.proposed_impact}</td>
                      <td className="py-3 pr-3 font-mono text-xs">
                        {contribution.evidence_hash ? (
                          <span title={contribution.evidence_hash}>{contribution.evidence_hash.slice(0, 18)}</span>
                        ) : (
                          <span className="text-muted">not confirmed</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <ImportedEvidence
                          packId={contribution.import_pack_id}
                          claimId={contribution.import_claim_id}
                          packHash={contribution.import_pack_hash}
                          provenance={contribution.import_provenance}
                          compact
                        />
                      </td>
                      <td className="py-3 pr-3">
                        {latestVerificationByContribution.get(contribution.id) ? (
                          <PmAgentVerification
                            verification={latestVerificationByContribution.get(contribution.id)!}
                            compact
                          />
                        ) : (
                          <span className="text-xs text-muted">
                            {contribution.import_pack_id ? "assessment unavailable" : "not assessed"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-muted">
                        {contribution.evidence_hash ? "Ready" : "Pending peer confirmation"}
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
