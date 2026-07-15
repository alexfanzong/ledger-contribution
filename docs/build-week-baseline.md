# OpenAI Build Week Baseline

- Baseline commit: `99d4683`
- Baseline date: 2026-07-04
- Submission-period development starts: 2026-07-14
- Competition branch: `codex/openai-build-week-contribution-import`

## Pre-existing

Supabase authentication, project membership, agent registration, manual contribution entry, database-enforced peer review, append-only reviewed rows, Evidence Hash v2 migration, and non-binding discussion weights.

## Build Week Increment

A repo-local Codex Skill creates a versioned Contribution Pack from evidence explicitly selected by the user. Ledger validates the pack deterministically, previews editable claims, and accepts selected claims into `pending_review`. Another authenticated member still performs peer confirmation, and Postgres remains responsible for authorization, append-only behavior, and the Evidence Hash.

Codex and GPT-5.6 are used through the Codex product while building and running the Skill. The competition build does not require an OpenAI API key and does not call the OpenAI API at product runtime.

## Migration Gate

`20260704000000_fix_contribution_insert_rls_scope.sql` and `20260704001000_canonical_json_v2.sql` existed locally but had not been applied to the remote Supabase project as of this note. Apply them in order only after confirming the remote contains test data only and receiving user approval.

## Trust Boundary

- Contribution Packs and uploaded JSON are untrusted input.
- The Skill may inspect only commits, files, test output, or summaries explicitly selected by the user.
- Importing never confirms a contribution.
- A user may attribute an imported claim only to themselves or an agent they own.
- Reviewed records remain append-only; corrections use `supersedes_id`.
- No wallet, contract, signing flow, or on-chain write is part of the Build Week increment.
