import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260715010000_pm_agent_verification.sql"
)

describe("PM Agent verification migration contract", () => {
  it("stores project-bound idempotent assessments behind RLS", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("create table contribution_agent_verifications")
    expect(sql).toContain("foreign key (contribution_id, project_id)")
    expect(sql).toContain("unique (contribution_id, policy_version, input_fingerprint)")
    expect(sql).toContain("alter table contribution_agent_verifications enable row level security")
    expect(sql).toContain("for select using (is_project_member(project_id))")
    expect(sql).toContain("before update on contribution_agent_verifications")
  })

  it("does not grant clients assessment mutation privileges", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase()

    expect(sql).toContain("grant select on contribution_agent_verifications to authenticated")
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)/)
  })

  it("routes authenticated imports through the PM wrapper only", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("rename to import_contribution_pack_claim_without_pm_verification")
    expect(sql).toContain("revoke all on function import_contribution_pack_claim_without_pm_verification")
    expect(sql).toContain("create or replace function import_contribution_pack_claim(")
    expect(sql).toContain("grant execute on function import_contribution_pack_claim(")
    expect(sql).not.toContain("update contributions")
  })

  it("keeps a valid contribution when advisory assessment fails", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("exception when others then")
    expect(sql).toContain("PM_AGENT_ASSESSMENT_FAILED")
    expect(sql.indexOf("v_contribution_id := import_contribution_pack_claim_without_pm_verification"))
      .toBeLessThan(sql.indexOf("exception when others then"))
  })

  it("keeps the SQL policy aligned with the TypeScript policy", () => {
    const sql = readFileSync(migrationPath, "utf8")

    expect(sql).toContain("not v_has_evidence or not v_verification_evidence_satisfied")
    expect(sql).toContain("v_uncertainty is not null")
    expect(sql).toContain("p_category <> 'code' or v_has_test_evidence")
    expect(sql).toContain("pm-demo-v1")
  })
})
