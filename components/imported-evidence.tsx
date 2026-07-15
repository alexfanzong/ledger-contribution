import { readContributionImportProvenance } from "@/lib/imports/provenance";

export function ImportedEvidence({
  packId,
  claimId,
  packHash,
  provenance,
  compact = false,
}: {
  packId: string | null;
  claimId: string | null;
  packHash: string | null;
  provenance: unknown;
  compact?: boolean;
}) {
  if (!packId || !claimId) return null;

  const parsed = readContributionImportProvenance(provenance);
  if (compact) {
    return (
      <div className="grid gap-1 text-xs text-muted">
        <span>Codex pack: {packId}</span>
        <span>Refs: {parsed?.evidence_refs.join(", ") ?? "unavailable"}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-line bg-panel p-3 text-sm">
      <div>
        <p className="font-medium">Imported Codex draft</p>
        <p className="font-mono text-xs text-muted">Pack: {packId}</p>
        <p className="font-mono text-xs text-muted">Claim: {claimId}</p>
        {packHash ? (
          <p className="font-mono text-xs text-muted" title={packHash}>
            Pack hash: {packHash.slice(0, 18)}
          </p>
        ) : null}
      </div>

      {parsed ? (
        <div className="grid gap-3">
          {parsed.evidence.map((evidence) => (
            <div key={evidence.ref}>
              <p className="font-medium">{evidence.title}</p>
              <p className="font-mono text-xs text-muted">{evidence.ref}</p>
              <p className="text-muted">{evidence.summary}</p>
              {evidence.uri ? (
                <p className="break-all font-mono text-xs text-muted">{evidence.uri}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Imported evidence metadata is unavailable or malformed.</p>
      )}

      <p className="text-xs text-muted">
        This is contributor-selected evidence. Confirm only what you can independently assess.
      </p>
    </div>
  );
}
