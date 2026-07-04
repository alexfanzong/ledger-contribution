# Contribution Ledger MVP

Real-stack MVP for contribution evidence, peer confirmation, server-side evidence hashes, and non-binding discussion weights for AI teams and early-stage startup teams.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth + Postgres
- Tailwind CSS
- Server Actions for all mutations
- Supabase migration for RLS, peer-confirmation RPC, immutable contributions, and server-side SHA-256 evidence hashes

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

3. Apply the migration in `supabase/migrations/20260611000000_initial_schema.sql` to your Supabase project.

4. Run the app:

```bash
npm run dev
```

## MVP Flow

1. Sign up or sign in with email.
2. Create a project or use **Create sample project**.
3. Invite members by email from the Members page.
4. Create milestones.
5. Log contributions.
6. Have another authenticated project member confirm, partially confirm, or reject each pending record.
7. Review confirmed records in the ledger.
8. Use the simulation page as a non-binding discussion weight view.

## Integrity Rules

- Project data is readable only by project members through RLS.
- Contribution review happens through `review_contribution`, a security-definer database function.
- A contributor cannot confirm their own contribution.
- An agent owner cannot confirm their own agent's contribution.
- Confirmed, partial, and rejected contribution rows are immutable.
- Corrections are new rows using `supersedes_id`.
- Evidence hashes are computed inside Postgres from canonical JSON, never in the browser.
- Wallets, signatures, gas, chain anchoring, payments, and token logic are intentionally out of scope.

