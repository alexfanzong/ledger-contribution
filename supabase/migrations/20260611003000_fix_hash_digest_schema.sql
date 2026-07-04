create or replace function contribution_evidence_hash(p_row contributions)
returns text
language sql
stable
as $$
  select encode(extensions.digest(contribution_canonical_json(p_row), 'sha256'::text), 'hex');
$$;
