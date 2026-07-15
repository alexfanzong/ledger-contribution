const EVIDENCE_KINDS = new Set([
  "commit",
  "file",
  "test",
  "deliverable",
  "summary",
])

export type ContributionImportProvenance = {
  evidence_refs: string[]
  evidence: Array<{
    ref: string
    kind: string
    title: string
    summary: string
    uri?: string
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max
}

export function readContributionImportProvenance(
  value: unknown
): ContributionImportProvenance | null {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.evidence_refs) || value.evidence_refs.length > 20) return null
  if (!Array.isArray(value.evidence) || value.evidence.length > 100) return null

  const refs = value.evidence_refs
  if (!refs.every((ref) => boundedString(ref, 1, 80))) return null
  if (new Set(refs).size !== refs.length) return null

  const evidence: ContributionImportProvenance["evidence"] = []
  for (const item of value.evidence) {
    if (!isRecord(item)) return null
    if (!boundedString(item.ref, 1, 80)) return null
    if (!boundedString(item.kind, 1, 30) || !EVIDENCE_KINDS.has(item.kind)) return null
    if (!boundedString(item.title, 1, 160)) return null
    if (!boundedString(item.summary, 1, 2000)) return null
    if (item.uri !== undefined && !boundedString(item.uri, 0, 500)) return null

    evidence.push({
      ref: item.ref,
      kind: item.kind,
      title: item.title,
      summary: item.summary,
      ...(item.uri === undefined ? {} : { uri: item.uri }),
    })
  }

  const evidenceRefs = new Set(evidence.map((item) => item.ref))
  if (!refs.every((ref) => evidenceRefs.has(ref))) return null

  return { evidence_refs: refs, evidence }
}
