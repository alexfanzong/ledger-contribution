-- Codex Contribution Pack import boundary.
--
-- Packs are untrusted JSON drafts. The application validates them for preview,
-- while this RPC independently enforces authentication, project membership,
-- self/owned-agent attribution, evidence references, and idempotency.

alter table contributions
  add column import_schema_version text,
  add column import_pack_id text,
  add column import_claim_id text,
  add column import_pack_hash text,
  add column import_claim_hash text,
  add column import_provenance jsonb,
  add column evidence_hash_version smallint;

alter table contributions
  add constraint contribution_import_fields_all_or_none check (
    (
      import_pack_id is null
      and import_schema_version is null
      and import_claim_id is null
      and import_pack_hash is null
      and import_claim_hash is null
      and import_provenance is null
    )
    or
    (
      import_schema_version = '1.0'
      and length(import_pack_id) between 1 and 100
      and length(import_claim_id) between 1 and 80
      and import_pack_hash ~ '^[0-9a-f]{64}$'
      and import_claim_hash ~ '^[0-9a-f]{64}$'
      and jsonb_typeof(import_provenance) = 'object'
    )
  ),
  add constraint contribution_evidence_hash_version_supported check (
    evidence_hash_version is null or evidence_hash_version = 3
  );

create unique index contributions_import_identity_idx
on contributions(project_id, import_pack_id, import_claim_id)
where import_pack_id is not null;

create table contribution_import_packs (
  project_id uuid not null references projects(id) on delete cascade,
  pack_id text not null check (length(pack_id) between 1 and 100),
  schema_version text not null check (schema_version = '1.0'),
  pack_hash text not null check (pack_hash ~ '^[0-9a-f]{64}$'),
  imported_by_member_id uuid not null references project_members(id),
  created_at timestamptz not null default now(),
  primary key (project_id, pack_id)
);

alter table contribution_import_packs enable row level security;

create policy "import packs readable by project members" on contribution_import_packs
for select using (is_project_member(project_id));

grant select on contribution_import_packs to authenticated;

create or replace function contribution_canonical_json(p_row contributions)
returns text
language sql
stable
as $$
  select concat(
    '{',
    '"_v":3,',
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
    '"import_claim_hash":', json_text(p_row.import_claim_hash), ',',
    '"import_claim_id":', json_text(p_row.import_claim_id), ',',
    '"import_pack_hash":', json_text(p_row.import_pack_hash), ',',
    '"import_pack_id":', json_text(p_row.import_pack_id), ',',
    '"import_provenance":', coalesce(p_row.import_provenance::text, 'null'), ',',
    '"import_schema_version":', json_text(p_row.import_schema_version), ',',
    '"milestone_id":', json_text(p_row.milestone_id::text), ',',
    '"project_id":', json_text(p_row.project_id::text), ',',
    '"proposed_impact":', json_text(p_row.proposed_impact), ',',
    '"reviewer_member_id":', json_text(p_row.reviewer_member_id::text), ',',
    '"status":', json_text(p_row.status), ',',
    '"supersedes_id":', json_text(p_row.supersedes_id::text),
    '}'
  );
$$;

create or replace function enforce_contribution_integrity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'pending_review' then
    raise exception 'Confirmed, partial, and rejected contribution records are immutable';
  end if;

  if tg_op = 'INSERT'
    and new.import_pack_id is not null
    and current_setting('ledger.import_authorized', true) is distinct from 'on'
  then
    raise exception 'Imported contribution records must use import_contribution_pack_claim';
  end if;

  if tg_op = 'UPDATE' and old.import_pack_id is not null and (
    new.import_schema_version is distinct from old.import_schema_version
    or new.import_pack_id is distinct from old.import_pack_id
    or new.import_claim_id is distinct from old.import_claim_id
    or new.import_pack_hash is distinct from old.import_pack_hash
    or new.import_claim_hash is distinct from old.import_claim_hash
    or new.import_provenance is distinct from old.import_provenance
  ) then
    raise exception 'Imported contribution provenance is immutable';
  end if;

  if new.status in ('confirmed', 'partial', 'rejected') then
    new.confirmed_at := coalesce(new.confirmed_at, now());

    if new.status in ('confirmed', 'partial') then
      if new.final_impact is null then
        raise exception 'final_impact is required for confirmed or partial contributions';
      end if;
      if new.reviewer_member_id is null then
        raise exception 'reviewer_member_id is required for confirmed or partial contributions';
      end if;
      new.evidence_hash_version := 3;
      new.evidence_hash := contribution_evidence_hash(new);
    else
      new.evidence_hash := null;
      new.evidence_hash_version := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function import_contribution_pack_claim(
  p_project_id uuid,
  p_pack jsonb,
  p_claim_id text,
  p_category text,
  p_description text,
  p_proposed_impact text,
  p_milestone_id uuid default null,
  p_contributor_agent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
  v_member_id uuid;
  v_contributor_type text;
  v_contributor_member_id uuid;
  v_contributor_agent_id uuid;
  v_contributor_label text;
  v_claim jsonb;
  v_selected_evidence jsonb;
  v_pack_id text;
  v_pack_hash text;
  v_claim_hash text;
  v_contribution_id uuid;
  v_existing_pack_hash text;
  v_existing_claim_hash text;
  v_registered_pack_hash text;
  v_registered_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'IMPORT_AUTH_REQUIRED';
  end if;

  if jsonb_typeof(p_pack) is distinct from 'object'
    or octet_length(p_pack::text) > 262144
  then
    raise exception 'IMPORT_INVALID_PACK';
  end if;

  select name into v_project_name from projects where id = p_project_id;
  if not found then
    raise exception 'IMPORT_PROJECT_NOT_FOUND';
  end if;

  v_member_id := current_project_member_id(p_project_id);
  if v_member_id is null then
    raise exception 'IMPORT_NOT_PROJECT_MEMBER';
  end if;

  if (p_pack->>'schema_version') is distinct from '1.0'
    or (p_pack->>'project_name') is distinct from v_project_name
  then
    raise exception 'IMPORT_PACK_PROJECT_MISMATCH';
  end if;

  v_pack_id := p_pack->>'pack_id';
  if v_pack_id is null or length(v_pack_id) not between 1 and 100 then
    raise exception 'IMPORT_INVALID_PACK_ID';
  end if;

  if jsonb_typeof(p_pack->'claims') is distinct from 'array'
    or jsonb_array_length(p_pack->'claims') not between 1 and 50
    or jsonb_typeof(p_pack->'evidence') is distinct from 'array'
    or jsonb_array_length(p_pack->'evidence') not between 1 and 100
  then
    raise exception 'IMPORT_INVALID_COLLECTIONS';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_pack->'evidence') as evidence(item)
    where jsonb_typeof(evidence.item->'ref') is distinct from 'string'
      or length(evidence.item->>'ref') not between 1 and 80
  ) or exists (
    select evidence.item->>'ref'
    from jsonb_array_elements(p_pack->'evidence') as evidence(item)
    group by evidence.item->>'ref'
    having count(*) > 1
  ) then
    raise exception 'IMPORT_INVALID_EVIDENCE';
  end if;

  if p_claim_id is null or length(p_claim_id) not between 1 and 80 then
    raise exception 'IMPORT_INVALID_CLAIM_ID';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_pack->'claims') as claim(item)
    where claim.item->>'claim_id' = p_claim_id
  ) <> 1 then
    raise exception 'IMPORT_CLAIM_NOT_FOUND';
  end if;

  select claim.item into v_claim
  from jsonb_array_elements(p_pack->'claims') as claim(item)
  where claim.item->>'claim_id' = p_claim_id;

  if jsonb_typeof(v_claim->'evidence_refs') is distinct from 'array'
    or jsonb_array_length(v_claim->'evidence_refs') not between 1 and 20
  then
    raise exception 'IMPORT_INVALID_EVIDENCE_REFS';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_claim->'evidence_refs') as ref(item)
    where jsonb_typeof(ref.item) is distinct from 'string'
      or length(ref.item #>> '{}') not between 1 and 80
  ) or exists (
    select ref.item #>> '{}'
    from jsonb_array_elements(v_claim->'evidence_refs') as ref(item)
    group by ref.item #>> '{}'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements_text(v_claim->'evidence_refs') as ref(value)
    where not exists (
      select 1
      from jsonb_array_elements(p_pack->'evidence') as evidence(item)
      where evidence.item->>'ref' = ref.value
    )
  ) then
    raise exception 'IMPORT_INVALID_EVIDENCE_REFS';
  end if;

  if p_category is null or p_category not in (
    'code', 'architecture', 'product', 'research', 'legal_compliance',
    'bd_sales', 'fundraising', 'design', 'content', 'operations',
    'review_approval', 'incident_resolution', 'on_call_availability'
  ) or p_description is null or length(p_description) not between 1 and 2000
    or p_proposed_impact is null or p_proposed_impact not in ('low', 'medium', 'high')
  then
    raise exception 'IMPORT_INVALID_CLAIM';
  end if;

  if p_milestone_id is not null and not exists (
    select 1 from milestones
    where id = p_milestone_id and project_id = p_project_id
  ) then
    raise exception 'IMPORT_INVALID_MILESTONE';
  end if;

  v_contributor_type := p_pack #>> '{contributor_hint,type}';
  if v_contributor_type = 'human' then
    v_contributor_member_id := v_member_id;
    v_contributor_agent_id := null;
    select display_name into v_contributor_label
    from project_members where id = v_member_id;
    if v_contributor_label is distinct from (p_pack #>> '{contributor_hint,display_name}') then
      raise exception 'IMPORT_MEMBER_MISMATCH';
    end if;
  elsif v_contributor_type = 'agent' then
    select id, name into v_contributor_agent_id, v_contributor_label
    from agent_registry
    where id = p_contributor_agent_id
      and project_id = p_project_id
      and owner_member_id = v_member_id
      and name = p_pack #>> '{contributor_hint,display_name}';

    if not found then
      raise exception 'IMPORT_AGENT_NOT_OWNED';
    end if;
    v_contributor_member_id := null;
  else
    raise exception 'IMPORT_INVALID_CONTRIBUTOR';
  end if;

  if (p_pack #>> '{generated_by,tool}') is distinct from 'codex' then
    raise exception 'IMPORT_INVALID_GENERATOR';
  end if;

  select coalesce(jsonb_agg(evidence.item order by evidence.ordinality), '[]'::jsonb)
  into v_selected_evidence
  from jsonb_array_elements(p_pack->'evidence') with ordinality as evidence(item, ordinality)
  where exists (
    select 1
    from jsonb_array_elements_text(v_claim->'evidence_refs') as ref(value)
    where ref.value = evidence.item->>'ref'
  );

  v_pack_hash := encode(
    extensions.digest(convert_to(p_pack::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into contribution_import_packs (
    project_id,
    pack_id,
    schema_version,
    pack_hash,
    imported_by_member_id
  ) values (
    p_project_id,
    v_pack_id,
    '1.0',
    v_pack_hash,
    v_member_id
  )
  on conflict (project_id, pack_id) do nothing;

  select pack_hash, imported_by_member_id
  into v_registered_pack_hash, v_registered_member_id
  from contribution_import_packs
  where project_id = p_project_id and pack_id = v_pack_id
  for update;

  if v_registered_pack_hash is distinct from v_pack_hash
    or v_registered_member_id is distinct from v_member_id
  then
    raise exception 'IMPORT_PACK_IDENTITY_CONFLICT';
  end if;

  v_claim_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'category', p_category,
          'contributor_agent_id', v_contributor_agent_id,
          'contributor_member_id', v_contributor_member_id,
          'description', p_description,
          'evidence_refs', v_claim->'evidence_refs',
          'milestone_id', p_milestone_id,
          'proposed_impact', p_proposed_impact
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform set_config('ledger.import_authorized', 'on', true);

  insert into contributions (
    project_id,
    milestone_id,
    contributor_type,
    contributor_member_id,
    contributor_agent_id,
    contributor_label,
    category,
    description,
    proposed_impact,
    status,
    reviewer_member_id,
    final_impact,
    evidence_hash,
    import_schema_version,
    import_pack_id,
    import_claim_id,
    import_pack_hash,
    import_claim_hash,
    import_provenance
  ) values (
    p_project_id,
    p_milestone_id,
    v_contributor_type,
    v_contributor_member_id,
    v_contributor_agent_id,
    v_contributor_label,
    p_category,
    p_description,
    p_proposed_impact,
    'pending_review',
    null,
    null,
    null,
    '1.0',
    v_pack_id,
    p_claim_id,
    v_pack_hash,
    v_claim_hash,
    jsonb_build_object(
      'contributor_hint', p_pack->'contributor_hint',
      'evidence', v_selected_evidence,
      'evidence_refs', v_claim->'evidence_refs',
      'generated_by', p_pack->'generated_by',
      'period', p_pack->'period'
    )
  )
  on conflict (project_id, import_pack_id, import_claim_id)
    where import_pack_id is not null
  do nothing
  returning id into v_contribution_id;

  if v_contribution_id is null then
    select id, import_pack_hash, import_claim_hash
    into v_contribution_id, v_existing_pack_hash, v_existing_claim_hash
    from contributions
    where project_id = p_project_id
      and import_pack_id = v_pack_id
      and import_claim_id = p_claim_id;

    if v_existing_pack_hash is distinct from v_pack_hash
      or v_existing_claim_hash is distinct from v_claim_hash
    then
      raise exception 'IMPORT_IDENTITY_CONFLICT';
    end if;
  end if;

  return v_contribution_id;
end;
$$;

revoke all on function import_contribution_pack_claim(
  uuid, jsonb, text, text, text, text, uuid, uuid
) from public;

grant execute on function import_contribution_pack_claim(
  uuid, jsonb, text, text, text, text, uuid, uuid
) to authenticated;
