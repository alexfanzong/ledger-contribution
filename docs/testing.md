# MVP Test Plan

The whole Product Flow below can be executed by one person using two email
accounts (normal + incognito window) — no real team required. See the
"休眠状态与激活 playbook" section in `AGENTS.md` for what solo testing does and
does not validate, and for the planned Playwright two-user E2E automation.

Latest real-stack validation notes:

- [MVP Validation Run - 2026-06-12](./validation-run-2026-06-12.md)

## Build Checks

```bash
npm run typecheck
npm run build
npm test
```

## Product Flow

- Sign up with two different email accounts.
- User A creates a project and milestone.
- User A registers an agent from the Members page.
- User A invites User B by email.
- User B accepts `/invite/<token>` while signed in with the invited email.
- User A logs a contribution.
- User A logs an agent contribution by choosing "On behalf of" the registered agent.
- User B sees the contribution in Peer confirmation and confirms it.
- The ledger shows an Evidence Hash for the confirmed record.
- The simulation page includes the confirmed record in Non-Binding Discussion Weight.
- Records without a milestone are grouped into one no-milestone bucket for diminishing returns.

## Codex Plugin Contribution Pack Flow

- Install `ledger-contribution@personal` from the repository marketplace and start a fresh Codex task.
- Invoke `$ledger-contribution-pack` with a bounded set of repository evidence.
- Verify the generated JSON with `plugins/ledger-contribution/skills/ledger-contribution-pack/scripts/validate-pack.mjs`.
- Sign in as User A and open **Import pack** for the matching project.
- Upload or paste the JSON and confirm the preview shows only the selected evidence.
- Edit a claim and submit it. Verify it appears as `pending_review` and shows pack id, claim id, evidence refs, and pack hash.
- Submit the same unchanged claim again. Verify only one contribution row exists and the existing id is returned.
- Change imported claim content while reusing the same pack and claim ids. Verify `IMPORT_IDENTITY_CONFLICT` is rejected and no second row is created.
- As User B, confirm the contribution. Verify Evidence Hash v3 is generated and the imported provenance remains visible.
- Verify User A cannot confirm their own imported human contribution or a contribution attributed to an agent User A owns.

## Database Integrity Checks

- Non-member read: sign in as a user who is not in the project and verify project tables return no rows.
- Self-review: call `review_contribution` as the original contributor and verify the function raises `Contributors cannot confirm their own contribution`.
- Agent-owner review: call `review_contribution` as the owner of the contributing agent and verify the function raises `Agent owners cannot confirm their own agent contribution`.
- Immutability: attempt a direct `update contributions set description = 'changed' where status in ('confirmed', 'partial', 'rejected')` and verify the trigger rejects it.
- Superseding: create a new contribution with `supersedes_id` pointing to a confirmed original; verify both rows remain visible and the original is struck-through in the ledger.
- Hash verification: recompute `select contribution_evidence_hash(c) from contributions c where c.id = '<confirmed-id>';` and verify it matches `evidence_hash`.
- Pack identity: race two imports with the same project/pack/claim identity and verify both calls resolve to one contribution id.
- Pack collision: reuse one pack id with a different pack hash or authenticated member and verify `IMPORT_PACK_IDENTITY_CONFLICT`.
- Import attribution: call `import_contribution_pack_claim` with another member's display name or an unowned agent id and verify `IMPORT_MEMBER_MISMATCH` or `IMPORT_AGENT_NOT_OWNED`.
- Provenance immutability: attempt to update any `import_*` column on a pending imported row and verify the trigger rejects it.
- RPC-only provenance: attempt a direct insert with `import_pack_id` and verify the trigger requires `import_contribution_pack_claim`.

## Legal Copy Check

Run:

```bash
rg "You own X% equity|AI-determined equity|Automatic founder equity|Legal ownership score" app components lib
```

Expected: no matches.
