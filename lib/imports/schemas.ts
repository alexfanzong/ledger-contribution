import {
  CONTRIBUTION_CATEGORIES,
  IMPACTS,
  type Impact,
} from "@/lib/types"

export const CONTRIBUTION_PACK_SCHEMA_VERSION = "1.0" as const

const EVIDENCE_KINDS = [
  "commit",
  "file",
  "test",
  "deliverable",
  "summary",
] as const

type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number]
type EvidenceKind = (typeof EVIDENCE_KINDS)[number]

export type ContributionPack = {
  schema_version: typeof CONTRIBUTION_PACK_SCHEMA_VERSION
  pack_id: string
  project_name: string
  period: {
    start: string
    end: string
  }
  contributor_hint: {
    type: "human" | "agent"
    display_name: string
  }
  evidence: Array<{
    ref: string
    kind: EvidenceKind
    uri?: string
    title: string
    summary: string
  }>
  claims: Array<{
    claim_id: string
    category: ContributionCategory
    description: string
    proposed_impact: Impact
    evidence_refs: string[]
    uncertainty?: string
  }>
  generated_by: {
    tool: "codex"
    model?: string
    generated_at: string
  }
}

export type ContributionPackIssue = {
  code: string
  path: string
  message: string
}

export type ContributionPackParseResult =
  | { success: true; data: ContributionPack }
  | { success: false; issues: ContributionPackIssue[] }

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

function isIsoDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T)
}

export function safeParseContributionPack(
  input: unknown
): ContributionPackParseResult {
  const issues: ContributionPackIssue[] = []

  const addIssue = (code: string, path: string, message: string) => {
    issues.push({ code, path, message })
  }

  const readString = (
    value: unknown,
    path: string,
    options: { min?: number; max: number; optional?: boolean }
  ): string | undefined => {
    if (value === undefined && options.optional) return undefined
    if (typeof value !== "string") {
      addIssue("INVALID_STRING", path, "Expected a string.")
      return undefined
    }

    const min = options.min ?? 0
    if (value.length < min || value.length > options.max) {
      addIssue(
        "INVALID_LENGTH",
        path,
        `Expected between ${min} and ${options.max} characters.`
      )
      return undefined
    }

    return value
  }

  if (!isRecord(input)) {
    return {
      success: false,
      issues: [
        {
          code: "INVALID_PACK",
          path: "$",
          message: "Contribution Pack must be a JSON object.",
        },
      ],
    }
  }

  if (input.schema_version !== CONTRIBUTION_PACK_SCHEMA_VERSION) {
    addIssue(
      "UNSUPPORTED_SCHEMA_VERSION",
      "schema_version",
      `Expected schema version ${CONTRIBUTION_PACK_SCHEMA_VERSION}.`
    )
  }

  const packId = readString(input.pack_id, "pack_id", { min: 1, max: 100 })
  const projectName = readString(input.project_name, "project_name", {
    min: 1,
    max: 120,
  })

  let period: ContributionPack["period"] | undefined
  if (!isRecord(input.period)) {
    addIssue("INVALID_OBJECT", "period", "Expected a period object.")
  } else {
    const start = readString(input.period.start, "period.start", {
      min: 10,
      max: 10,
    })
    const end = readString(input.period.end, "period.end", {
      min: 10,
      max: 10,
    })

    if (start && !isDateOnly(start)) {
      addIssue("INVALID_DATE", "period.start", "Expected a valid YYYY-MM-DD date.")
    }
    if (end && !isDateOnly(end)) {
      addIssue("INVALID_DATE", "period.end", "Expected a valid YYYY-MM-DD date.")
    }
    if (start && end && isDateOnly(start) && isDateOnly(end)) {
      if (end < start) {
        addIssue(
          "INVALID_PERIOD",
          "period",
          "Period end must be on or after period start."
        )
      }
      period = { start, end }
    }
  }

  let contributorHint: ContributionPack["contributor_hint"] | undefined
  if (!isRecord(input.contributor_hint)) {
    addIssue(
      "INVALID_OBJECT",
      "contributor_hint",
      "Expected a contributor hint object."
    )
  } else {
    const contributorType = input.contributor_hint.type
    if (!isOneOf(contributorType, ["human", "agent"] as const)) {
      addIssue(
        "INVALID_CONTRIBUTOR_TYPE",
        "contributor_hint.type",
        "Contributor type must be human or agent."
      )
    }
    const displayName = readString(
      input.contributor_hint.display_name,
      "contributor_hint.display_name",
      { min: 1, max: 120 }
    )
    if (isOneOf(contributorType, ["human", "agent"] as const) && displayName) {
      contributorHint = { type: contributorType, display_name: displayName }
    }
  }

  const evidence: ContributionPack["evidence"] = []
  const evidenceRefs = new Set<string>()
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    addIssue(
      "INVALID_EVIDENCE",
      "evidence",
      "Expected at least one evidence item."
    )
  } else if (input.evidence.length > 100) {
    addIssue("TOO_MANY_EVIDENCE_ITEMS", "evidence", "At most 100 items are allowed.")
  } else {
    input.evidence.forEach((item, index) => {
      const path = `evidence[${index}]`
      if (!isRecord(item)) {
        addIssue("INVALID_OBJECT", path, "Expected an evidence object.")
        return
      }

      const ref = readString(item.ref, `${path}.ref`, { min: 1, max: 80 })
      if (ref) {
        if (evidenceRefs.has(ref)) {
          addIssue(
            "DUPLICATE_EVIDENCE_REF",
            `${path}.ref`,
            `Evidence reference ${ref} is duplicated.`
          )
        } else {
          evidenceRefs.add(ref)
        }
      }

      const kind = item.kind
      if (!isOneOf(kind, EVIDENCE_KINDS)) {
        addIssue(
          "INVALID_EVIDENCE_KIND",
          `${path}.kind`,
          "Unsupported evidence kind."
        )
      }
      const uri = readString(item.uri, `${path}.uri`, {
        max: 500,
        optional: true,
      })
      const title = readString(item.title, `${path}.title`, {
        min: 1,
        max: 160,
      })
      const summary = readString(item.summary, `${path}.summary`, {
        min: 1,
        max: 2000,
      })

      if (ref && isOneOf(kind, EVIDENCE_KINDS) && title && summary) {
        evidence.push({
          ref,
          kind,
          ...(uri === undefined ? {} : { uri }),
          title,
          summary,
        })
      }
    })
  }

  const claims: ContributionPack["claims"] = []
  const claimIds = new Set<string>()
  if (!Array.isArray(input.claims) || input.claims.length === 0) {
    addIssue("INVALID_CLAIMS", "claims", "Expected at least one claim.")
  } else if (input.claims.length > 50) {
    addIssue("TOO_MANY_CLAIMS", "claims", "At most 50 claims are allowed.")
  } else {
    input.claims.forEach((item, index) => {
      const path = `claims[${index}]`
      if (!isRecord(item)) {
        addIssue("INVALID_OBJECT", path, "Expected a claim object.")
        return
      }

      const claimId = readString(item.claim_id, `${path}.claim_id`, {
        min: 1,
        max: 80,
      })
      if (claimId) {
        if (claimIds.has(claimId)) {
          addIssue(
            "DUPLICATE_CLAIM_ID",
            `${path}.claim_id`,
            `Claim id ${claimId} is duplicated.`
          )
        } else {
          claimIds.add(claimId)
        }
      }

      const category = item.category
      if (!isOneOf(category, CONTRIBUTION_CATEGORIES)) {
        addIssue(
          "INVALID_CATEGORY",
          `${path}.category`,
          "Unsupported contribution category."
        )
      }
      const description = readString(item.description, `${path}.description`, {
        min: 1,
        max: 2000,
      })
      const proposedImpact = item.proposed_impact
      if (!isOneOf(proposedImpact, IMPACTS)) {
        addIssue(
          "INVALID_IMPACT",
          `${path}.proposed_impact`,
          "Impact must be low, medium, or high."
        )
      }

      const refs: string[] = []
      if (!Array.isArray(item.evidence_refs) || item.evidence_refs.length === 0) {
        addIssue(
          "INVALID_EVIDENCE_REFS",
          `${path}.evidence_refs`,
          "Each claim must reference at least one evidence item."
        )
      } else if (item.evidence_refs.length > 20) {
        addIssue(
          "TOO_MANY_EVIDENCE_REFS",
          `${path}.evidence_refs`,
          "A claim may reference at most 20 evidence items."
        )
      } else {
        const seenRefs = new Set<string>()
        item.evidence_refs.forEach((value, refIndex) => {
          const refPath = `${path}.evidence_refs[${refIndex}]`
          const ref = readString(value, refPath, { min: 1, max: 80 })
          if (!ref) return
          if (seenRefs.has(ref)) {
            addIssue(
              "DUPLICATE_CLAIM_EVIDENCE_REF",
              refPath,
              `Evidence reference ${ref} is repeated in this claim.`
            )
            return
          }
          seenRefs.add(ref)
          refs.push(ref)
          if (!evidenceRefs.has(ref)) {
            addIssue(
              "UNKNOWN_EVIDENCE_REF",
              refPath,
              `Evidence reference ${ref} does not exist in this pack.`
            )
          }
        })
      }

      const uncertainty = readString(item.uncertainty, `${path}.uncertainty`, {
        max: 1000,
        optional: true,
      })

      if (
        claimId &&
        isOneOf(category, CONTRIBUTION_CATEGORIES) &&
        description &&
        isOneOf(proposedImpact, IMPACTS) &&
        refs.length > 0
      ) {
        claims.push({
          claim_id: claimId,
          category,
          description,
          proposed_impact: proposedImpact,
          evidence_refs: refs,
          ...(uncertainty === undefined ? {} : { uncertainty }),
        })
      }
    })
  }

  let generatedBy: ContributionPack["generated_by"] | undefined
  if (!isRecord(input.generated_by)) {
    addIssue("INVALID_OBJECT", "generated_by", "Expected generation metadata.")
  } else {
    if (input.generated_by.tool !== "codex") {
      addIssue(
        "INVALID_GENERATOR",
        "generated_by.tool",
        "Contribution Packs must identify Codex as the generator."
      )
    }
    const model = readString(input.generated_by.model, "generated_by.model", {
      max: 100,
      optional: true,
    })
    const generatedAt = readString(
      input.generated_by.generated_at,
      "generated_by.generated_at",
      { min: 1, max: 50 }
    )
    if (generatedAt && !isIsoDateTime(generatedAt)) {
      addIssue(
        "INVALID_DATETIME",
        "generated_by.generated_at",
        "Expected an ISO 8601 date-time."
      )
    }
    if (
      input.generated_by.tool === "codex" &&
      generatedAt &&
      isIsoDateTime(generatedAt)
    ) {
      generatedBy = {
        tool: "codex",
        ...(model === undefined ? {} : { model }),
        generated_at: generatedAt,
      }
    }
  }

  if (
    issues.length > 0 ||
    !packId ||
    !projectName ||
    !period ||
    !contributorHint ||
    !generatedBy
  ) {
    return { success: false, issues }
  }

  return {
    success: true,
    data: {
      schema_version: CONTRIBUTION_PACK_SCHEMA_VERSION,
      pack_id: packId,
      project_name: projectName,
      period,
      contributor_hint: contributorHint,
      evidence,
      claims,
      generated_by: generatedBy,
    },
  }
}
