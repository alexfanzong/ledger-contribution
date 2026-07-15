#!/usr/bin/env node

import { readFile } from "node:fs/promises"

const MAX_BYTES = 256 * 1024
const CATEGORIES = new Set([
  "code",
  "architecture",
  "product",
  "research",
  "legal_compliance",
  "bd_sales",
  "fundraising",
  "design",
  "content",
  "operations",
  "review_approval",
  "incident_resolution",
  "on_call_availability",
])
const IMPACTS = new Set(["low", "medium", "high"])
const EVIDENCE_KINDS = new Set([
  "commit",
  "file",
  "test",
  "deliverable",
  "summary",
])

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value, min, max) {
  return typeof value === "string" && value.length >= min && value.length <= max
}

function isDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

function validate(pack) {
  const errors = []
  const add = (path, message) => errors.push(`${path}: ${message}`)

  if (!isObject(pack)) return ["$: expected a JSON object"]
  if (pack.schema_version !== "1.0") add("schema_version", "expected 1.0")
  if (!isString(pack.pack_id, 1, 100)) add("pack_id", "expected 1-100 characters")
  if (!isString(pack.project_name, 1, 120)) {
    add("project_name", "expected 1-120 characters")
  }

  if (!isObject(pack.period)) {
    add("period", "expected an object")
  } else {
    if (!isDateOnly(pack.period.start)) add("period.start", "expected YYYY-MM-DD")
    if (!isDateOnly(pack.period.end)) add("period.end", "expected YYYY-MM-DD")
    if (
      isDateOnly(pack.period.start) &&
      isDateOnly(pack.period.end) &&
      pack.period.end < pack.period.start
    ) {
      add("period", "end must be on or after start")
    }
  }

  if (!isObject(pack.contributor_hint)) {
    add("contributor_hint", "expected an object")
  } else {
    if (!new Set(["human", "agent"]).has(pack.contributor_hint.type)) {
      add("contributor_hint.type", "expected human or agent")
    }
    if (!isString(pack.contributor_hint.display_name, 1, 120)) {
      add("contributor_hint.display_name", "expected 1-120 characters")
    }
  }

  const evidenceRefs = new Set()
  if (!Array.isArray(pack.evidence) || pack.evidence.length < 1 || pack.evidence.length > 100) {
    add("evidence", "expected 1-100 items")
  } else {
    pack.evidence.forEach((item, index) => {
      const path = `evidence[${index}]`
      if (!isObject(item)) {
        add(path, "expected an object")
        return
      }
      if (!isString(item.ref, 1, 80)) {
        add(`${path}.ref`, "expected 1-80 characters")
      } else if (evidenceRefs.has(item.ref)) {
        add(`${path}.ref`, "must be unique")
      } else {
        evidenceRefs.add(item.ref)
      }
      if (!EVIDENCE_KINDS.has(item.kind)) add(`${path}.kind`, "unsupported kind")
      if (item.uri !== undefined && !isString(item.uri, 0, 500)) {
        add(`${path}.uri`, "expected at most 500 characters")
      }
      if (!isString(item.title, 1, 160)) add(`${path}.title`, "expected 1-160 characters")
      if (!isString(item.summary, 1, 2000)) {
        add(`${path}.summary`, "expected 1-2000 characters")
      }
    })
  }

  const claimIds = new Set()
  if (!Array.isArray(pack.claims) || pack.claims.length < 1 || pack.claims.length > 50) {
    add("claims", "expected 1-50 items")
  } else {
    pack.claims.forEach((item, index) => {
      const path = `claims[${index}]`
      if (!isObject(item)) {
        add(path, "expected an object")
        return
      }
      if (!isString(item.claim_id, 1, 80)) {
        add(`${path}.claim_id`, "expected 1-80 characters")
      } else if (claimIds.has(item.claim_id)) {
        add(`${path}.claim_id`, "must be unique")
      } else {
        claimIds.add(item.claim_id)
      }
      if (!CATEGORIES.has(item.category)) add(`${path}.category`, "unsupported category")
      if (!isString(item.description, 1, 2000)) {
        add(`${path}.description`, "expected 1-2000 characters")
      }
      if (!IMPACTS.has(item.proposed_impact)) {
        add(`${path}.proposed_impact`, "expected low, medium, or high")
      }
      if (
        !Array.isArray(item.evidence_refs) ||
        item.evidence_refs.length < 1 ||
        item.evidence_refs.length > 20
      ) {
        add(`${path}.evidence_refs`, "expected 1-20 items")
      } else {
        const localRefs = new Set()
        item.evidence_refs.forEach((ref, refIndex) => {
          const refPath = `${path}.evidence_refs[${refIndex}]`
          if (!isString(ref, 1, 80)) add(refPath, "expected 1-80 characters")
          else if (localRefs.has(ref)) add(refPath, "must be unique within the claim")
          else if (!evidenceRefs.has(ref)) add(refPath, "does not match pack evidence")
          localRefs.add(ref)
        })
      }
      if (item.uncertainty !== undefined && !isString(item.uncertainty, 0, 1000)) {
        add(`${path}.uncertainty`, "expected at most 1000 characters")
      }
    })
  }

  if (!isObject(pack.generated_by)) {
    add("generated_by", "expected an object")
  } else {
    if (pack.generated_by.tool !== "codex") add("generated_by.tool", "expected codex")
    if (
      pack.generated_by.model !== undefined &&
      !isString(pack.generated_by.model, 0, 100)
    ) {
      add("generated_by.model", "expected at most 100 characters")
    }
    if (
      !isString(pack.generated_by.generated_at, 1, 50) ||
      !/^\d{4}-\d{2}-\d{2}T/.test(pack.generated_by.generated_at) ||
      Number.isNaN(Date.parse(pack.generated_by.generated_at))
    ) {
      add("generated_by.generated_at", "expected an ISO 8601 date-time")
    }
  }

  return errors
}

const packPath = process.argv[2]
if (!packPath) {
  console.error("Usage: validate-pack.mjs <contribution-pack.json>")
  process.exit(2)
}

let bytes
try {
  bytes = await readFile(packPath)
} catch {
  console.error(`ERROR: unable to read ${packPath}`)
  process.exit(2)
}

if (bytes.byteLength > MAX_BYTES) {
  console.error(`ERROR: pack exceeds ${MAX_BYTES} bytes`)
  process.exit(1)
}

let pack
try {
  pack = JSON.parse(bytes.toString("utf8"))
} catch {
  console.error("ERROR: pack is not valid JSON")
  process.exit(1)
}

const errors = validate(pack)
if (errors.length > 0) {
  console.error("INVALID Contribution Pack")
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log("VALID Contribution Pack v1.0")
