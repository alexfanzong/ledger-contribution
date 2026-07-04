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

grant execute on function create_project_with_owner(text, text) to authenticated;
