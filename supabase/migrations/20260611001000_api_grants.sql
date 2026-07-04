grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function review_contribution(uuid, text, text, text) to authenticated;
grant execute on function accept_project_invitation(uuid) to authenticated;
grant execute on function invitation_by_token(uuid) to anon, authenticated;
grant execute on function create_sample_project() to authenticated;
