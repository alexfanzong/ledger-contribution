# Contribution Ledger MVP

Real-stack MVP for contribution evidence, peer confirmation, server-side evidence hashes, and non-binding discussion weights for AI teams and early-stage startup teams.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth + Postgres
- Tailwind CSS
- Server Actions for all mutations
- Supabase migration for RLS, peer-confirmation RPC, immutable contributions, and server-side SHA-256 evidence hashes

Supabase is the current managed Postgres host, not a permanent product coupling. The Codex Skill is stateless and database-independent; a future MCP-backed app can connect to the same Ledger service boundary without changing the pack format.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Apply every migration in `supabase/migrations/` to your Supabase project, in filename (timestamp) order.

4. Run the app:

```bash
npm run dev
```

5. Checks:

```bash
npm run typecheck
npm test
```

See `AGENTS.md` for the current project status, prioritized backlog, and working rules for coding agents.

## MVP Flow

1. Sign up or sign in with email.
2. Create a project or use **Create sample project**.
3. Invite members by email from the Members page.
4. Create milestones.
5. Log contributions.
6. Have another authenticated project member confirm, partially confirm, or reject each pending record.
7. Review confirmed records in the ledger.
8. Use the simulation page as a non-binding discussion weight view.

## Codex Contribution Pack Flow

The repository includes a Codex-native Skill at `.agents/skills/ledger-contribution-pack`. It turns only the work evidence a user explicitly places in scope into a versioned JSON draft. It does not need an OpenAI API key and does not scan Codex account history, environment variables, unrelated folders, or the computer.

1. Invoke `$ledger-contribution-pack` and identify the repository evidence and time range to include.
2. Inspect the generated `ledger-contribution-pack.json` draft.
3. Validate it independently:

```bash
node .agents/skills/ledger-contribution-pack/scripts/validate-pack.mjs ledger-contribution-pack.json
```

4. Open **Import pack** inside the target Ledger project, upload or paste the JSON, and inspect the editable preview.
5. Submit claims individually. Each becomes `pending_review`; a different project member still has to confirm it.

The import RPC binds a human pack to the authenticated member, or an agent pack to an agent that member owns. A project-level pack identity plus a claim-level unique identity makes concurrent retries idempotent. Imported evidence provenance becomes part of canonical Evidence Hash v3 after peer confirmation.

## Integrity Rules

- Project data is readable only by project members through RLS.
- Contribution review happens through `review_contribution`, a security-definer database function.
- A contributor cannot confirm their own contribution.
- An agent owner cannot confirm their own agent's contribution.
- Confirmed, partial, and rejected contribution rows are immutable.
- Corrections are new rows using `supersedes_id`.
- Evidence hashes are computed inside Postgres from canonical JSON, never in the browser.
- Codex packs cannot set reviewer, review status, final impact, or Evidence Hash.
- A `(project, pack, claim)` identity prevents duplicate imports, and one pack id cannot be reused with different content or by another member.
- Wallets, signatures, gas, chain anchoring, payments, and token logic are intentionally out of scope.
