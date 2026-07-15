# OpenAI Build Week Baseline

- Baseline commit: `7ee0cbd`
- Baseline date: 2026-07-04
- Submission-period development starts: 2026-07-14
- Competition branch: `codex/openai-build-week-contribution-import`

## Pre-existing

Supabase authentication, project membership, agent registration, manual contribution entry, database-enforced peer review, append-only reviewed rows, Evidence Hash v2 migration, and non-binding discussion weights.

## Build Week Increment

An installable Codex plugin, containing the repo's bounded `ledger-contribution-pack` Skill, creates a versioned Contribution Pack from evidence explicitly selected by the user. Ledger validates the pack deterministically, previews editable claims, and accepts selected claims into `pending_review`. Another authenticated member still performs peer confirmation, and Postgres remains responsible for authorization, append-only behavior, idempotent import, and canonical Evidence Hash v3.

Codex and GPT-5.6 are used through the Codex product while building and running the plugin workflow. The competition build does not require an OpenAI API key and does not call the OpenAI API at product runtime.

## Migration Gate

The following migrations have not been applied to the remote Supabase project in this development run:

1. `20260704000000_fix_contribution_insert_rls_scope.sql`
2. `20260704001000_canonical_json_v2.sql`
3. `20260715000000_contribution_pack_import.sql`

Apply them in order only after confirming the remote contains test data only and receiving user approval. The third migration adds the idempotent import RPC, immutable provenance fields, and canonical Evidence Hash v3.

## Trust Boundary

- Contribution Packs and uploaded JSON are untrusted input.
- The plugin may inspect only commits, files, test output, or summaries explicitly selected by the user.
- Importing never confirms a contribution.
- A user may attribute an imported claim only to themselves or an agent they own.
- Reviewed records remain append-only; corrections use `supersedes_id`.
- No wallet, contract, signing flow, or on-chain write is part of the Build Week increment.
