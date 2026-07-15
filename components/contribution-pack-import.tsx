"use client";

import { useState } from "react";
import { importContributionPackClaim } from "@/lib/actions";
import {
  parseContributionPackText,
  validatePackForActor,
  type PackActorContext,
} from "@/lib/imports/validate";
import type { ContributionPack, ContributionPackIssue } from "@/lib/imports/schemas";
import { CONTRIBUTION_CATEGORIES, IMPACTS } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { Button, Field, inputClass, Panel } from "@/components/ui";

const MAX_PACK_BYTES = 256 * 1024;

export function ContributionPackImport({
  actor,
  milestones,
}: {
  actor: PackActorContext;
  milestones: Array<{ id: string; title: string }>;
}) {
  const [packText, setPackText] = useState("");
  const [pack, setPack] = useState<ContributionPack | null>(null);
  const [issues, setIssues] = useState<ContributionPackIssue[]>([]);

  const previewText = (text: string) => {
    const parsed = parseContributionPackText(text);
    if (!parsed.success) {
      setPack(null);
      setIssues(parsed.issues);
      return;
    }

    const actorValidation = validatePackForActor(parsed.data, actor);
    if (!actorValidation.success) {
      setPack(null);
      setIssues(actorValidation.issues);
      return;
    }

    setPack(parsed.data);
    setIssues([]);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PACK_BYTES) {
      setPack(null);
      setIssues([
        {
          code: "PACK_TOO_LARGE",
          path: "$",
          message: `Contribution Pack must be no larger than ${MAX_PACK_BYTES} bytes.`,
        },
      ]);
      return;
    }

    const text = await file.text();
    setPackText(text);
    previewText(text);
  };

  const evidenceByRef = new Map(pack?.evidence.map((item) => [item.ref, item]) ?? []);
  const normalizedPack = pack ? JSON.stringify(pack) : "";

  return (
    <div className="grid gap-4">
      <Panel title="Load a Codex Contribution Pack">
        <div className="grid gap-4">
          <p className="rounded-md border border-line bg-panel p-3 text-sm text-muted">
            Ledger receives only this user-selected JSON file. It does not scan your Codex history,
            account, repository, or computer. Evidence text is displayed as data and never executed.
          </p>

          <Field label="Choose JSON file">
            <input
              className={inputClass}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
          </Field>

          <Field label="Or paste Contribution Pack JSON">
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={12}
              value={packText}
              onChange={(event) => {
                setPackText(event.target.value);
                setPack(null);
                setIssues([]);
              }}
              placeholder='{"schema_version":"1.0", ...}'
            />
          </Field>

          <div>
            <Button type="button" onClick={() => previewText(packText)} disabled={!packText.trim()}>
              Validate and preview
            </Button>
          </div>

          {issues.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">This pack cannot be imported.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.path}-${index}`}>
                    {issue.path}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Panel>

      {pack ? (
        <Panel title="Editable claim preview">
          <div className="mb-4 grid gap-1 rounded-md border border-line bg-panel p-3 text-sm">
            <p><span className="font-medium">Pack:</span> {pack.pack_id}</p>
            <p><span className="font-medium">Project:</span> {pack.project_name}</p>
            <p><span className="font-medium">Period:</span> {pack.period.start} to {pack.period.end}</p>
            <p>
              <span className="font-medium">Contributor hint:</span>{" "}
              {pack.contributor_hint.display_name} ({pack.contributor_hint.type})
            </p>
            <p className="text-muted">
              Each accepted claim becomes pending only. A different project member must confirm it.
            </p>
          </div>

          <div className="grid gap-4">
            {pack.claims.map((claim) => (
              <form
                action={importContributionPackClaim}
                className="grid gap-4 rounded-md border border-line p-4"
                key={claim.claim_id}
              >
                <input type="hidden" name="project_id" value={actor.project.id} />
                <input type="hidden" name="pack_json" value={normalizedPack} />
                <input type="hidden" name="claim_id" value={claim.claim_id} />

                <div>
                  <p className="font-mono text-xs text-muted">{claim.claim_id}</p>
                  <p className="mt-1 text-sm text-muted">
                    Evidence: {claim.evidence_refs.join(", ")}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Category">
                    <select className={inputClass} name="category" defaultValue={claim.category}>
                      {CONTRIBUTION_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Suggested impact">
                    <select
                      className={inputClass}
                      name="proposed_impact"
                      defaultValue={claim.proposed_impact}
                    >
                      {IMPACTS.map((impact) => (
                        <option key={impact} value={impact}>{impact}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Milestone">
                    <select className={inputClass} name="milestone_id" defaultValue="">
                      <option value="">No milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    className={inputClass}
                    name="description"
                    rows={4}
                    defaultValue={claim.description}
                    required
                  />
                </Field>

                <div className="grid gap-2 rounded-md bg-panel p-3 text-sm">
                  {claim.evidence_refs.map((ref) => {
                    const evidence = evidenceByRef.get(ref);
                    return evidence ? (
                      <div key={ref}>
                        <p className="font-medium">{evidence.title}</p>
                        <p className="font-mono text-xs text-muted">{evidence.ref}</p>
                        <p className="text-muted">{evidence.summary}</p>
                        {evidence.uri ? (
                          <p className="break-all font-mono text-xs text-muted">{evidence.uri}</p>
                        ) : null}
                      </div>
                    ) : null;
                  })}
                </div>

                {claim.uncertainty ? (
                  <p className="text-sm text-muted">Uncertainty: {claim.uncertainty}</p>
                ) : null}

                <div>
                  <SubmitButton
                    className="focus-ring min-h-10 rounded-md bg-ink px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    pendingLabel="Submitting..."
                  >
                    Submit this claim for peer confirmation
                  </SubmitButton>
                </div>
              </form>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
