-- Deterministic Demo PM Agent pre-verification.
--
-- The assessment is advisory and append-only. It never sets the human
-- reviewer, final impact, contribution status, confirmation time, or Evidence
-- Hash. Authenticated clients receive select access only; assessment creation
-- happens inside the existing validated Contribution Pack import boundary.

alter table contributions
  add constraint contributions_id_project_id_key unique (id, project_id);

create table contribution_agent_verifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contribution_id uuid not null,
  decision text not null check (
    decision in ('agent_verified', 'needs_review', 'insufficient_evidence')
  ),
  policy_version text not null check (policy_version = 'pm-demo-v1'),
  verifier_kind text not null check (
    verifier_kind = 'deterministic_demo_pm_agent'
  ),
  checks jsonb not null check (
    jsonb_typeof(checks) = 'array'
    and jsonb_array_length(checks) between 1 and 10
  ),
  summary text not null check (length(summary) between 1 and 1000),
  input_fingerprint text not null check (input_fingerprint ~ '^[0-9a-f]{64}$'),
  evaluated_at timestamptz not null default now(),
  foreign key (contribution_id, project_id)
    references contributions(id, project_id) on delete cascade,
  unique (contribution_id, policy_version, input_fingerprint)
);

create index contribution_agent_verifications_project_contribution_idx
on contribution_agent_verifications(project_id, contribution_id, evaluated_at desc);

alter table contribution_agent_verifications enable row level security;

create policy "PM assessments readable by project members"
on contribution_agent_verifications
for select using (is_project_member(project_id));

grant select on contribution_agent_verifications to authenticated;

create or replace function prevent_pm_agent_verification_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'PM Agent verification records are immutable';
end;
$$;

create trigger contribution_agent_verifications_immutable
before update on contribution_agent_verifications
for each row execute function prevent_pm_agent_verification_update();

-- Preserve the already-validated import implementation as an internal helper.
-- Its privileges move with the rename, so revoke client execution explicitly.
alter function import_contribution_pack_claim(
  uuid, jsonb, text, text, text, text, uuid, uuid
) rename to import_contribution_pack_claim_without_pm_verification;

revoke all on function import_contribution_pack_claim_without_pm_verification(
  uuid, jsonb, text, text, text, text, uuid, uuid
) from public, anon, authenticated;

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
  v_contribution_id uuid;
  v_claim jsonb;
  v_selected_evidence jsonb;
  v_pack_hash text;
  v_claim_hash text;
  v_input_fingerprint text;
  v_uncertainty text;
  v_has_evidence boolean;
  v_references_resolved boolean;
  v_has_test_evidence boolean;
  v_verification_evidence_satisfied boolean;
  v_decision text;
  v_summary text;
  v_checks jsonb;
begin
  v_contribution_id := import_contribution_pack_claim_without_pm_verification(
    p_project_id,
    p_pack,
    p_claim_id,
    p_category,
    p_description,
    p_proposed_impact,
    p_milestone_id,
    p_contributor_agent_id
  );

  begin
  select claim.item into strict v_claim
  from jsonb_array_elements(p_pack->'claims') as claim(item)
  where claim.item->>'claim_id' = p_claim_id;

  select coalesce(jsonb_agg(evidence.item order by evidence.ordinality), '[]'::jsonb)
  into v_selected_evidence
  from jsonb_array_elements(p_pack->'evidence') with ordinality as evidence(item, ordinality)
  where exists (
    select 1
    from jsonb_array_elements_text(v_claim->'evidence_refs') as ref(value)
    where ref.value = evidence.item->>'ref'
  );

  v_has_evidence := jsonb_array_length(v_selected_evidence) > 0;
  v_references_resolved :=
    jsonb_array_length(v_selected_evidence) = jsonb_array_length(v_claim->'evidence_refs');
  v_uncertainty := nullif(btrim(v_claim->>'uncertainty'), '');

  select exists (
    select 1
    from jsonb_array_elements(v_selected_evidence) as evidence(item)
    where evidence.item->>'kind' = 'test'
  ) into v_has_test_evidence;

  v_verification_evidence_satisfied :=
    p_category <> 'code' or v_has_test_evidence;

  if not v_has_evidence or not v_verification_evidence_satisfied then
    v_decision := 'insufficient_evidence';
    v_summary :=
      'The claim does not include enough linked evidence for PM Agent pre-verification.';
  elsif not v_references_resolved
    or v_uncertainty is not null
  then
    v_decision := 'needs_review';
    v_summary :=
      'Selected evidence needs human judgment before attribution and impact are confirmed.';
  else
    v_decision := 'agent_verified';
    v_summary :=
      'Selected evidence passes the Demo PM Agent policy. Human confirmation is still required.';
  end if;

  v_checks := jsonb_build_array(
    jsonb_build_object(
      'id', 'evidence_linked',
      'passed', v_has_evidence,
      'explanation', case when v_has_evidence
        then 'The claim links at least one selected evidence item.'
        else 'No selected evidence item supports this claim.'
      end
    ),
    jsonb_build_object(
      'id', 'references_resolved',
      'passed', v_references_resolved,
      'explanation', case when v_references_resolved
        then 'Every claim reference resolves inside the validated Contribution Pack.'
        else 'One or more claim references do not resolve inside the selected evidence.'
      end
    ),
    jsonb_build_object(
      'id', 'verification_evidence',
      'passed', v_verification_evidence_satisfied,
      'explanation', case
        when p_category <> 'code'
          then 'A test evidence item is not required for this contribution category.'
        when v_has_test_evidence
          then 'The code claim includes linked test evidence.'
        else 'Code claims require linked test evidence for Agent Verified.'
      end
    ),
    jsonb_build_object(
      'id', 'uncertainty_clear',
      'passed', v_uncertainty is null,
      'explanation', case when v_uncertainty is null
        then 'The pack records no unresolved uncertainty for this claim.'
        else 'The pack records uncertainty that requires human judgment.'
      end
    )
  );

  select import_pack_hash, import_claim_hash
  into strict v_pack_hash, v_claim_hash
  from contributions
  where id = v_contribution_id and project_id = p_project_id;

  v_input_fingerprint := encode(
    extensions.digest(
      convert_to(
        concat(v_pack_hash, ':', v_claim_hash, ':pm-demo-v1'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into contribution_agent_verifications (
    project_id,
    contribution_id,
    decision,
    policy_version,
    verifier_kind,
    checks,
    summary,
    input_fingerprint
  ) values (
    p_project_id,
    v_contribution_id,
    v_decision,
    'pm-demo-v1',
    'deterministic_demo_pm_agent',
    v_checks,
    v_summary,
    v_input_fingerprint
  )
  on conflict (contribution_id, policy_version, input_fingerprint) do nothing;

  exception when others then
    raise warning 'PM_AGENT_ASSESSMENT_FAILED contribution_id=%', v_contribution_id;
  end;

  return v_contribution_id;
end;
$$;

revoke all on function import_contribution_pack_claim(
  uuid, jsonb, text, text, text, text, uuid, uuid
) from public;

grant execute on function import_contribution_pack_claim(
  uuid, jsonb, text, text, text, text, uuid, uuid
) to authenticated;
