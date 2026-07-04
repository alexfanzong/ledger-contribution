-- Fix: in the original insert policy, the unqualified `project_id` inside the
-- agent_registry subquery resolved to ar.project_id (innermost scope wins in
-- Postgres), making the project-match condition trivially true. A member of two
-- projects could attribute a contribution in project X to an agent registered
-- in project Y via a direct PostgREST call. Qualify every outer-row column with
-- the table name so the agent must belong to the same project as the new row.

drop policy "members can create pending own contributions" on contributions;

create policy "members can create pending own contributions" on contributions
for insert with check (
  is_project_member(contributions.project_id)
  and contributions.status = 'pending_review'
  and contributions.reviewer_member_id is null
  and contributions.final_impact is null
  and contributions.evidence_hash is null
  and (
    (
      contributions.contributor_type = 'agent'
      and exists (
        select 1
        from agent_registry ar
        where ar.id = contributions.contributor_agent_id
          and ar.project_id = contributions.project_id
          and ar.owner_member_id = current_project_member_id(contributions.project_id)
      )
    )
    or (
      contributions.contributor_type <> 'agent'
      and contributions.contributor_member_id = current_project_member_id(contributions.project_id)
    )
  )
);

-- Hardening: anon never needs table reads. RLS already blocks anon on every
-- table, but defense in depth costs nothing. The public invite page keeps
-- working because invitation_by_token() is security definer and stays granted
-- to anon.
revoke select on all tables in schema public from anon;
