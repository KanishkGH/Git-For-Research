-- Let workspace owners invite existing researcher accounts as editors or viewers.
-- Run after 008_retrieval.sql. SQL Editor should execute this as the database owner.

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id and w.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id and w.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = (select auth.uid()) and m.role in ('owner', 'editor')
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.can_edit_workspace(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;

create function public.add_workspace_member_by_email(
  target_workspace_id uuid,
  target_email text,
  target_role text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_user_id uuid;
  result_id uuid;
begin
  if not exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id and w.owner_id = (select auth.uid())
  ) then
    raise exception 'Only the workspace owner can add members';
  end if;
  if target_role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer';
  end if;

  select u.id into target_user_id from public.users u
  where lower(u.email) = lower(trim(target_email));
  if target_user_id is null then
    raise exception 'Researcher not found. Ask them to sign up and sign in first.';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'You are already the workspace owner';
  end if;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (target_workspace_id, target_user_id, target_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role
  where public.workspace_members.role <> 'owner'
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.add_workspace_member_by_email(uuid, text, text) from public, anon;
grant execute on function public.add_workspace_member_by_email(uuid, text, text) to authenticated;

drop policy if exists users_own on public.users;
create policy users_read_coworkers on public.users for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.workspace_members m
    where m.user_id = users.id and public.is_workspace_member(m.workspace_id)
  ));
create policy users_insert_self on public.users for insert to authenticated
  with check (id = (select auth.uid()));
create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists workspaces_own on public.workspaces;
create policy workspaces_read_members on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_insert_owner on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy workspaces_update_owner on public.workspaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy workspaces_delete_owner on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists workspace_members_own on public.workspace_members;
create policy workspace_members_read on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy workspace_members_insert_owner on public.workspace_members for insert to authenticated
  with check (exists (
    select 1 from public.workspaces w where w.id = workspace_id
      and w.owner_id = (select auth.uid())
  ) and (role <> 'owner' or user_id = (select auth.uid())));
create policy workspace_members_update_owner on public.workspace_members for update to authenticated
  using (exists (
    select 1 from public.workspaces w where w.id = workspace_id
      and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w where w.id = workspace_id
      and w.owner_id = (select auth.uid())
  ) and (role <> 'owner' or user_id = (select auth.uid())));
create policy workspace_members_delete_owner on public.workspace_members for delete to authenticated
  using (role <> 'owner' and exists (
    select 1 from public.workspaces w where w.id = workspace_id
      and w.owner_id = (select auth.uid())
  ));

drop policy if exists artifacts_own on public.artifacts;
create policy artifacts_read_members on public.artifacts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy artifacts_write_editors on public.artifacts for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy artifacts_update_editors on public.artifacts for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy artifacts_delete_editors on public.artifacts for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

drop policy if exists commits_own on public.commits;
create policy commits_read_members on public.commits for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy commits_write_editors on public.commits for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy commits_update_editors on public.commits for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy commits_delete_editors on public.commits for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

drop policy if exists branches_own on public.branches;
create policy branches_read_members on public.branches for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy branches_write_editors on public.branches for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy branches_update_editors on public.branches for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy branches_delete_editors on public.branches for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

drop policy if exists merge_records_own on public.merge_records;
create policy merge_records_read_members on public.merge_records for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy merge_records_write_editors on public.merge_records for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy merge_records_update_editors on public.merge_records for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy merge_records_delete_editors on public.merge_records for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

drop policy if exists presence_sessions_own on public.presence_sessions;
create policy presence_sessions_read_members on public.presence_sessions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy presence_sessions_write_self on public.presence_sessions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy presence_sessions_update_self on public.presence_sessions for update to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy presence_sessions_delete_self on public.presence_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists commit_chunks_owner on public.commit_chunks;
create policy commit_chunks_read_members on public.commit_chunks for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy commit_chunks_write_editors on public.commit_chunks for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy commit_chunks_update_editors on public.commit_chunks for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy commit_chunks_delete_editors on public.commit_chunks for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

drop policy if exists artifacts_owner_access on storage.objects;
create policy artifacts_read_members on storage.objects for select to authenticated
  using (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where storage.objects.name like 'raw/' || w.id::text || '/%'
      and public.is_workspace_member(w.id)
  ));
create policy artifacts_insert_editors on storage.objects for insert to authenticated
  with check (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where storage.objects.name like 'raw/' || w.id::text || '/%'
      and public.can_edit_workspace(w.id)
  ));
create policy artifacts_update_editors on storage.objects for update to authenticated
  using (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where storage.objects.name like 'raw/' || w.id::text || '/%'
      and public.can_edit_workspace(w.id)
  ))
  with check (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where storage.objects.name like 'raw/' || w.id::text || '/%'
      and public.can_edit_workspace(w.id)
  ));
create policy artifacts_delete_editors on storage.objects for delete to authenticated
  using (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where storage.objects.name like 'raw/' || w.id::text || '/%'
      and public.can_edit_workspace(w.id)
  ));
