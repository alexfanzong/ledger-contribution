create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  is_demo boolean not null default false,
  created_at timestamptz default now()
);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member', 'reviewer')),
  display_name text not null,
  email text,
  is_demo boolean not null default false,
  created_at timestamptz default now(),
  unique (project_id, profile_id)
);

create table project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member', 'reviewer')),
  token uuid not null unique,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique (project_id, email)
);

create table agent_registry (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  owner_member_id uuid references project_members(id) on delete cascade,
  name text not null,
  agent_type text,
  created_at timestamptz default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  status text default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  assignee_member_id uuid references project_members(id),
  created_at timestamptz default now()
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  contributor_type text not null check (contributor_type in ('human', 'agent', 'contractor', 'advisor')),
  contributor_member_id uuid references project_members(id),
  contributor_agent_id uuid references agent_registry(id),
  contributor_label text not null,
  category text not null check (category in (
    'code', 'architecture', 'product', 'research', 'legal_compliance',
    'bd_sales', 'fundraising', 'design', 'content', 'operations',
    'review_approval', 'incident_resolution', 'on_call_availability'
  )),
  description text not null,
  evidence_url text,
  proposed_impact text check (proposed_impact in ('low', 'medium', 'high')),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'partial', 'rejected')),
  reviewer_member_id uuid references project_members(id),
  final_impact text check (final_impact in ('low', 'medium', 'high')),
  review_note text,
  confirmed_at timestamptz,
  evidence_hash text,
  supersedes_id uuid references contributions(id),
  is_demo boolean not null default false,
  created_at timestamptz default now(),
  check (
    (contributor_type = 'agent' and contributor_agent_id is not null)
    or (contributor_type <> 'agent' and contributor_member_id is not null)
  )
);

create table capital_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  contributor_member_id uuid references project_members(id) not null,
  kind text not null check (kind in ('cash', 'ip')),
  amount numeric,
  currency text default 'USD',
  description text not null,
  evidence_url text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'rejected')),
  confirmed_by_member_id uuid references project_members(id),
  confirmed_at timestamptz,
  evidence_hash text,
  created_at timestamptz default now()
);

create table retainer_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  provider_member_id uuid references project_members(id) not null,
  scope text not null,
  sla_response_hours integer not null,
  monthly_fee_display text,
  status text default 'active' check (status in ('active', 'paused', 'ended')),
  started_at date,
  created_at timestamptz default now()
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  retainer_id uuid references retainer_agreements(id) on delete cascade,
  title text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  reported_at timestamptz not null default now(),
  responded_at timestamptz,
  resolved_at timestamptz,
  resolution_summary text,
  linked_contribution_id uuid references contributions(id),
  created_at timestamptz default now()
);

create table category_weights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  category text not null,
  weight numeric not null default 1.0 check (weight >= 0.5 and weight <= 2.0),
  unique (project_id, category)
);

create index project_members_project_idx on project_members(project_id);
create index project_members_profile_idx on project_members(profile_id);
create index contributions_project_idx on contributions(project_id);
create index contributions_pending_idx on contributions(project_id, status);
create index invitations_token_idx on project_invitations(token);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

create or replace function is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = auth.uid()
      and pm.is_demo = false
  );
$$;

create or replace function current_project_member_id(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pm.id
  from project_members pm
  where pm.project_id = p_project_id
    and pm.profile_id = auth.uid()
    and pm.is_demo = false
  limit 1;
$$;

create or replace function is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = auth.uid()
      and pm.role = 'owner'
      and pm.is_demo = false
  );
$$;

create or replace function json_text(p_value text)
returns text
language sql
immutable
as $$
  select coalesce(to_jsonb(p_value)::text, 'null');
$$;

create or replace function contribution_canonical_json(p_row contributions)
returns text
language sql
stable
as $$
  select concat(
    '{',
    '"category":', json_text(p_row.category), ',',
    '"confirmed_at":', json_text(case when p_row.confirmed_at is null then null else to_char(p_row.confirmed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end), ',',
    '"contributor_label":', json_text(p_row.contributor_label), ',',
    '"contributor_type":', json_text(p_row.contributor_type), ',',
    '"description":', json_text(p_row.description), ',',
    '"evidence_url":', json_text(p_row.evidence_url), ',',
    '"final_impact":', json_text(p_row.final_impact), ',',
    '"milestone_id":', json_text(p_row.milestone_id::text), ',',
    '"project_id":', json_text(p_row.project_id::text), ',',
    '"reviewer_member_id":', json_text(p_row.reviewer_member_id::text), ',',
    '"status":', json_text(p_row.status),
    '}'
  );
$$;

create or replace function contribution_evidence_hash(p_row contributions)
returns text
language sql
stable
as $$
  select encode(extensions.digest(contribution_canonical_json(p_row), 'sha256'::text), 'hex');
$$;

create or replace function enforce_contribution_integrity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'pending_review' then
    raise exception 'Confirmed, partial, and rejected contribution records are immutable';
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
      new.evidence_hash := contribution_evidence_hash(new);
    else
      new.evidence_hash := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger contribution_integrity_before_write
before insert or update on contributions
for each row execute function enforce_contribution_integrity();

create or replace function review_contribution(
  p_contribution_id uuid,
  p_status text,
  p_final_impact text default null,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution contributions%rowtype;
  v_reviewer_member_id uuid;
begin
  if p_status not in ('confirmed', 'partial', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  if p_status in ('confirmed', 'partial') and p_final_impact not in ('low', 'medium', 'high') then
    raise exception 'final_impact is required for confirmed or partial contributions';
  end if;

  select * into v_contribution
  from contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Contribution not found';
  end if;

  if v_contribution.status <> 'pending_review' then
    raise exception 'Contribution has already been reviewed';
  end if;

  v_reviewer_member_id := current_project_member_id(v_contribution.project_id);
  if v_reviewer_member_id is null then
    raise exception 'Only project members can review contributions';
  end if;

  if v_contribution.contributor_member_id = v_reviewer_member_id then
    raise exception 'Contributors cannot confirm their own contribution';
  end if;

  if v_contribution.contributor_type = 'agent' and exists (
    select 1
    from agent_registry ar
    where ar.id = v_contribution.contributor_agent_id
      and ar.owner_member_id = v_reviewer_member_id
  ) then
    raise exception 'Agent owners cannot confirm their own agent contribution';
  end if;

  update contributions
  set status = p_status,
      final_impact = case when p_status = 'rejected' then null else p_final_impact end,
      reviewer_member_id = v_reviewer_member_id,
      review_note = p_review_note
  where id = p_contribution_id;

  return p_contribution_id;
end;
$$;

create or replace function accept_project_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite project_invitations%rowtype;
  v_user_email text;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from project_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation not found or expired';
  end if;

  select email, coalesce(nullif(raw_user_meta_data->>'display_name', ''), split_part(email, '@', 1))
  into v_user_email, v_display_name
  from auth.users
  where id = auth.uid();

  if lower(v_user_email) <> lower(v_invite.email) then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into project_members (project_id, profile_id, role, display_name, email)
  values (v_invite.project_id, auth.uid(), v_invite.role, v_display_name, v_user_email)
  on conflict (project_id, profile_id) do update
    set role = excluded.role,
        display_name = excluded.display_name,
        email = excluded.email;

  update project_invitations
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.project_id;
end;
$$;

create or replace function invitation_by_token(p_token uuid)
returns table(email text, role text, project_name text)
language sql
stable
security definer
set search_path = public
as $$
  select pi.email, pi.role, p.name
  from project_invitations pi
  join projects p on p.id = pi.project_id
  where pi.token = p_token
    and pi.accepted_at is null
    and pi.expires_at > now();
$$;

create or replace function create_sample_project()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_project_id uuid;
  v_owner_member_id uuid;
  v_demo_member_id uuid;
  v_reviewer_member_id uuid;
  v_agent_id uuid;
  v_milestone_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into profiles (id, email, display_name)
  select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1))
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  insert into projects (owner_id, name, description, is_demo)
  values (
    auth.uid(),
    'Sample AI Team Ledger',
    'Sample data showing peer confirmation, evidence hashes, and non-binding discussion weight.',
    true
  )
  returning id into v_project_id;

  insert into project_members (project_id, profile_id, role, display_name, email)
  select v_project_id, u.id, 'owner', coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1)), u.email
  from auth.users u
  where u.id = auth.uid()
  returning id into v_owner_member_id;

  insert into project_members (project_id, role, display_name, email, is_demo)
  values (v_project_id, 'member', 'Maya Chen', 'sample-maya@example.com', true)
  returning id into v_demo_member_id;

  insert into project_members (project_id, role, display_name, email, is_demo)
  values (v_project_id, 'reviewer', 'Jordan Lee', 'sample-jordan@example.com', true)
  returning id into v_reviewer_member_id;

  insert into milestones (project_id, title, description, target_date)
  values (v_project_id, 'Pilot launch', 'Sample milestone for validating the contribution ledger loop.', current_date + 14)
  returning id into v_milestone_id;

  insert into agent_registry (project_id, owner_member_id, name, agent_type)
  values (v_project_id, v_demo_member_id, 'Research Agent A', 'research')
  returning id into v_agent_id;

  insert into contributions (
    project_id, milestone_id, contributor_type, contributor_member_id, contributor_label,
    category, description, evidence_url, proposed_impact, status, reviewer_member_id,
    final_impact, review_note, is_demo
  )
  values (
    v_project_id, v_milestone_id, 'human', v_demo_member_id, 'Maya Chen',
    'product', 'Defined the pilot onboarding checklist and acceptance criteria.',
    'https://example.com/sample-onboarding', 'medium', 'confirmed', v_owner_member_id,
    'medium', 'Confirmed as useful for pilot readiness.', true
  );

  insert into contributions (
    project_id, milestone_id, contributor_type, contributor_agent_id, contributor_label,
    category, description, evidence_url, proposed_impact, status, reviewer_member_id,
    final_impact, review_note, is_demo
  )
  values (
    v_project_id, v_milestone_id, 'agent', v_agent_id, 'Research Agent A',
    'research', 'Summarized competitor onboarding patterns for the team review.',
    'https://example.com/sample-research', 'low', 'partial', v_owner_member_id,
    'low', 'Useful, but required human editing.', true
  );

  insert into contributions (
    project_id, milestone_id, contributor_type, contributor_member_id, contributor_label,
    category, description, proposed_impact, status, reviewer_member_id, review_note, is_demo
  )
  values (
    v_project_id, v_milestone_id, 'human', v_reviewer_member_id, 'Jordan Lee',
    'operations', 'Proposed an operations task that was not adopted.',
    'low', 'rejected', v_owner_member_id, 'Not used in the pilot.', true
  );

  insert into contributions (
    project_id, milestone_id, contributor_type, contributor_member_id, contributor_label,
    category, description, proposed_impact, is_demo
  )
  values (
    v_project_id, v_milestone_id, 'human', v_owner_member_id, 'Current user',
    'architecture', 'Pending architecture note waiting for another member to review.',
    'high', true
  );

  with original as (
    insert into contributions (
      project_id, milestone_id, contributor_type, contributor_member_id, contributor_label,
      category, description, evidence_url, proposed_impact, status, reviewer_member_id,
      final_impact, review_note, is_demo
    )
    values (
      v_project_id, v_milestone_id, 'human', v_demo_member_id, 'Maya Chen',
      'content', 'Drafted sample launch copy before later correction.',
      'https://example.com/old-copy', 'low', 'confirmed', v_owner_member_id,
      'low', 'Original version confirmed before correction.', true
    )
    returning id
  )
  insert into contributions (
    project_id, milestone_id, contributor_type, contributor_member_id, contributor_label,
    category, description, evidence_url, proposed_impact, status, reviewer_member_id,
    final_impact, review_note, supersedes_id, is_demo
  )
  select
    v_project_id, v_milestone_id, 'human', v_demo_member_id, 'Maya Chen',
    'content', 'Revised sample launch copy after peer feedback.',
    'https://example.com/new-copy', 'medium', 'confirmed', v_owner_member_id,
    'medium', 'Correction supersedes the older copy record.', original.id, true
  from original;

  return v_project_id;
end;
$$;

create or replace function create_project_with_owner(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_project_id uuid;
  v_user_email text;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email, coalesce(nullif(raw_user_meta_data->>'display_name', ''), split_part(email, '@', 1))
  into v_user_email, v_display_name
  from auth.users
  where id = auth.uid();

  insert into profiles (id, email, display_name)
  values (auth.uid(), v_user_email, v_display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name);

  insert into projects (owner_id, name, description)
  values (auth.uid(), p_name, p_description)
  returning id into v_project_id;

  insert into project_members (project_id, profile_id, role, display_name, email)
  values (v_project_id, auth.uid(), 'owner', v_display_name, v_user_email)
  on conflict (project_id, profile_id) do update
    set role = 'owner',
        display_name = excluded.display_name,
        email = excluded.email;

  return v_project_id;
end;
$$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_invitations enable row level security;
alter table agent_registry enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table contributions enable row level security;
alter table capital_contributions enable row level security;
alter table retainer_agreements enable row level security;
alter table incidents enable row level security;
alter table category_weights enable row level security;

create policy "profiles can read own profile" on profiles
for select using (id = auth.uid());

create policy "profiles can insert own profile" on profiles
for insert with check (id = auth.uid());

create policy "profiles can update own profile" on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "projects readable by members" on projects
for select using (is_project_member(id));

create policy "authenticated users can create projects" on projects
for insert with check (owner_id = auth.uid());

create policy "project owners can update projects" on projects
for update using (is_project_owner(id)) with check (is_project_owner(id));

create policy "project owners can delete projects" on projects
for delete using (is_project_owner(id));

create policy "members readable by project members" on project_members
for select using (is_project_member(project_id));

create policy "owners can add members" on project_members
for insert with check (is_project_owner(project_id));

create policy "owners can update members" on project_members
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "owners can remove members" on project_members
for delete using (is_project_owner(project_id));

create policy "invitations readable by project members" on project_invitations
for select using (is_project_member(project_id));

create policy "owners can create invitations" on project_invitations
for insert with check (is_project_owner(project_id));

create policy "owners can update invitations" on project_invitations
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "agents readable by project members" on agent_registry
for select using (is_project_member(project_id));

create policy "members can create owned agents" on agent_registry
for insert with check (
  is_project_member(project_id)
  and owner_member_id = current_project_member_id(project_id)
);

create policy "owners can update agents" on agent_registry
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "milestones readable by project members" on milestones
for select using (is_project_member(project_id));

create policy "members can create milestones" on milestones
for insert with check (is_project_member(project_id));

create policy "owners can update milestones" on milestones
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "tasks readable by project members" on tasks
for select using (is_project_member(project_id));

create policy "members can create tasks" on tasks
for insert with check (is_project_member(project_id));

create policy "members can update tasks" on tasks
for update using (is_project_member(project_id)) with check (is_project_member(project_id));

create policy "contributions readable by project members" on contributions
for select using (is_project_member(project_id));

create policy "members can create pending own contributions" on contributions
for insert with check (
  is_project_member(project_id)
  and status = 'pending_review'
  and reviewer_member_id is null
  and final_impact is null
  and evidence_hash is null
  and (
    (
      contributor_type = 'agent'
      and exists (
        select 1
        from agent_registry ar
        where ar.id = contributor_agent_id
          and ar.project_id = project_id
          and ar.owner_member_id = current_project_member_id(project_id)
      )
    )
    or (
      contributor_type <> 'agent'
      and contributor_member_id = current_project_member_id(project_id)
    )
  )
);

create policy "capital readable by project members" on capital_contributions
for select using (is_project_member(project_id));

create policy "members can create capital records" on capital_contributions
for insert with check (is_project_member(project_id));

create policy "owners can update capital records" on capital_contributions
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "retainers readable by project members" on retainer_agreements
for select using (is_project_member(project_id));

create policy "owners can create retainers" on retainer_agreements
for insert with check (is_project_owner(project_id));

create policy "owners can update retainers" on retainer_agreements
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "incidents readable by project members" on incidents
for select using (is_project_member(project_id));

create policy "members can create incidents" on incidents
for insert with check (is_project_member(project_id));

create policy "members can update incidents" on incidents
for update using (is_project_member(project_id)) with check (is_project_member(project_id));

create policy "weights readable by project members" on category_weights
for select using (is_project_member(project_id));

create policy "owners can create weights" on category_weights
for insert with check (is_project_owner(project_id));

create policy "owners can update weights" on category_weights
for update using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "owners can delete weights" on category_weights
for delete using (is_project_owner(project_id));

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function review_contribution(uuid, text, text, text) to authenticated;
grant execute on function accept_project_invitation(uuid) to authenticated;
grant execute on function invitation_by_token(uuid) to anon, authenticated;
grant execute on function create_sample_project() to authenticated;
grant execute on function create_project_with_owner(text, text) to authenticated;
