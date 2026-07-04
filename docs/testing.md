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

## Database Integrity Checks

- Non-member read: sign in as a user who is not in the project and verify project tables return no rows.
- Self-review: call `review_contribution` as the original contributor and verify the function raises `Contributors cannot confirm their own contribution`.
- Agent-owner review: call `review_contribution` as the owner of the contributing agent and verify the function raises `Agent owners cannot confirm their own agent contribution`.
- Immutability: attempt a direct `update contributions set description = 'changed' where status in ('confirmed', 'partial', 'rejected')` and verify the trigger rejects it.
- Superseding: create a new contribution with `supersedes_id` pointing to a confirmed original; verify both rows remain visible and the original is struck-through in the ledger.
- Hash verification: recompute `select contribution_evidence_hash(c) from contributions c where c.id = '<confirmed-id>';` and verify it matches `evidence_hash`.

## Legal Copy Check

Run:

```bash
rg "You own X% equity|AI-determined equity|Automatic founder equity|Legal ownership score" app components lib
```

Expected: no matches.
