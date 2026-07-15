import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260715020000_pm_agent_review_hardening.sql"
)

describe("PM Agent review hardening migration contract", () => {
  it("stores bounded claim uncertainty with the assessment", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("add column uncertainty text")
    expect(sql).toContain("length(uncertainty) <= 1000")
    expect(sql).toMatch(/checks,\s*summary,\s*uncertainty,\s*input_fingerprint/)
  })

  it("validates evidence content at the database boundary", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("IMPORT_INVALID_EVIDENCE_CONTENT")
    expect(sql).toContain("('commit', 'file', 'test', 'deliverable', 'summary')")
    expect(sql).toContain("length(evidence.item->>'title') not between 1 and 160")
    expect(sql).toContain("length(evidence.item->>'summary') not between 1 and 2000")
    expect(sql).toContain("length(evidence.item->>'uri') > 500")
  })

  it("validates uncertainty before the advisory failure boundary", () => {
    const sql = readFileSync(migrationPath, "utf8")
    const validationIndex = sql.indexOf("IMPORT_INVALID_UNCERTAINTY")
    const advisoryBoundaryIndex = sql.indexOf("begin\n    select claim.item")

    expect(validationIndex).toBeGreaterThan(-1)
    expect(advisoryBoundaryIndex).toBeGreaterThan(validationIndex)
  })

  it("replaces the wrapper without granting the internal importer", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("create or replace function import_contribution_pack_claim(")
    expect(sql).toContain("import_contribution_pack_claim_without_pm_verification(")
    expect(sql).toContain("grant execute on function import_contribution_pack_claim(")
    expect(sql).not.toContain("grant execute on function import_contribution_pack_claim_without_pm_verification")
  })
})
