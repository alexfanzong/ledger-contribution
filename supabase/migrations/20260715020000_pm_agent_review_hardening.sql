-- Keep the reviewer-facing uncertainty beside the deterministic assessment,
-- and independently validate evidence content at the database import boundary.
-- This migration replaces only the public wrapper created in 20260715010000;
-- the validated internal importer remains client-inaccessible.

alter table contribution_agent_verifications
  add column uncertainty text check (
    uncertainty is null or length(uncertainty) <= 1000
  );

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

  select claim.item into strict v_claim
  from jsonb_array_elements(p_pack->'claims') as claim(item)
  where claim.item->>'claim_id' = p_claim_id;

  if exists (
    select 1
    from jsonb_array_elements(p_pack->'evidence') as evidence(item)
    where jsonb_typeof(evidence.item) is distinct from 'object'
      or jsonb_typeof(evidence.item->'kind') is distinct from 'string'
      or evidence.item->>'kind' not in ('commit', 'file', 'test', 'deliverable', 'summary')
      or jsonb_typeof(evidence.item->'title') is distinct from 'string'
      or length(evidence.item->>'title') not between 1 and 160
      or jsonb_typeof(evidence.item->'summary') is distinct from 'string'
      or length(evidence.item->>'summary') not between 1 and 2000
      or (
        evidence.item ? 'uri'
        and (
          jsonb_typeof(evidence.item->'uri') is distinct from 'string'
          or length(evidence.item->>'uri') > 500
        )
      )
  ) then
    raise exception 'IMPORT_INVALID_EVIDENCE_CONTENT';
  end if;

  if v_claim ? 'uncertainty' and (
    jsonb_typeof(v_claim->'uncertainty') is distinct from 'string'
    or length(v_claim->>'uncertainty') > 1000
  ) then
    raise exception 'IMPORT_INVALID_UNCERTAINTY';
  end if;

  v_uncertainty := nullif(btrim(v_claim->>'uncertainty', E' \t\n\r'), '');

  -- Assessment failures stay advisory: a valid imported contribution remains
  -- available for peer review even if assessment persistence later fails.
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
    elsif not v_references_resolved or v_uncertainty is not null then
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
      uncertainty,
      input_fingerprint
    ) values (
      p_project_id,
      v_contribution_id,
      v_decision,
      'pm-demo-v1',
      'deterministic_demo_pm_agent',
      v_checks,
      v_summary,
      v_uncertainty,
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
