-- Canonical JSON v2 for evidence hashes.
--
-- v1 omitted the row id, created_at, proposed_impact, supersedes_id, and the
-- contributor ids. Consequences: two identical contributions produced identical
-- hashes (the hash could not prove "there were two records"), the correction
-- chain (supersedes_id) was outside hash protection, and the contributor was
-- only pinned by a mutable display label.
--
-- v2 adds those fields plus an explicit "_v":2 version marker, keys sorted
-- alphabetically. Rows confirmed before this migration keep their stored v1
-- hashes; recomputing them with this function will NOT match. That is
-- acceptable while all data is test data — recreate sample projects after
-- applying. If real confirmed rows ever exist before this runs, add a
-- hash_version column instead of replacing the function.

create or replace function contribution_canonical_json(p_row contributions)
returns text
language sql
stable
as $$
  select concat(
    '{',
    '"_v":2,',
    '"category":', json_text(p_row.category), ',',
    '"confirmed_at":', json_text(case when p_row.confirmed_at is null then null else to_char(p_row.confirmed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end), ',',
    '"contributor_agent_id":', json_text(p_row.contributor_agent_id::text), ',',
    '"contributor_label":', json_text(p_row.contributor_label), ',',
    '"contributor_member_id":', json_text(p_row.contributor_member_id::text), ',',
    '"contributor_type":', json_text(p_row.contributor_type), ',',
    '"created_at":', json_text(case when p_row.created_at is null then null else to_char(p_row.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end), ',',
    '"description":', json_text(p_row.description), ',',
    '"evidence_url":', json_text(p_row.evidence_url), ',',
    '"final_impact":', json_text(p_row.final_impact), ',',
    '"id":', json_text(p_row.id::text), ',',
    '"milestone_id":', json_text(p_row.milestone_id::text), ',',
    '"project_id":', json_text(p_row.project_id::text), ',',
    '"proposed_impact":', json_text(p_row.proposed_impact), ',',
    '"reviewer_member_id":', json_text(p_row.reviewer_member_id::text), ',',
    '"status":', json_text(p_row.status), ',',
    '"supersedes_id":', json_text(p_row.supersedes_id::text),
    '}'
  );
$$;
