-- Replace the temporary anonymous demo access with account-based access.
-- This app currently supports one workspace owner per workspace.

revoke all on table public.users, public.workspaces, public.workspace_members,
  public.artifacts, public.commits, public.branches, public.merge_records,
  public.presence_sessions from anon;

grant select, insert, update, delete on table public.users, public.workspaces,
  public.workspace_members, public.artifacts, public.commits, public.branches,
  public.merge_records, public.presence_sessions to authenticated;

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.artifacts enable row level security;
alter table public.commits enable row level security;
alter table public.branches enable row level security;
alter table public.merge_records enable row level security;
alter table public.presence_sessions enable row level security;

drop policy if exists local_demo_access on public.users;
drop policy if exists local_demo_access on public.workspaces;
drop policy if exists local_demo_access on public.workspace_members;
drop policy if exists local_demo_access on public.artifacts;
drop policy if exists local_demo_access on public.commits;
drop policy if exists local_demo_access on public.branches;
drop policy if exists local_demo_access on public.merge_records;
drop policy if exists local_demo_access on public.presence_sessions;

create policy users_own on public.users for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy workspaces_own on public.workspaces for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy workspace_members_own on public.workspace_members for all to authenticated
  using (
    user_id = (select auth.uid()) and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid()) and role = 'owner' and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = (select auth.uid())
    )
  );

create policy artifacts_own on public.artifacts for all to authenticated
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

create policy commits_own on public.commits for all to authenticated
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

create policy branches_own on public.branches for all to authenticated
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

create policy merge_records_own on public.merge_records for all to authenticated
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

create policy presence_sessions_own on public.presence_sessions for all to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

-- Raw uploads are optional, but when the artifacts bucket exists its files
-- follow the same workspace ownership rule.
drop policy if exists artifacts_owner_access on storage.objects;
create policy artifacts_owner_access on storage.objects for all to authenticated
  using (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where w.owner_id = (select auth.uid())
      and storage.objects.name like 'raw/' || w.id::text || '/%'
  ))
  with check (bucket_id = 'artifacts' and exists (
    select 1 from public.workspaces w
    where w.owner_id = (select auth.uid())
      and storage.objects.name like 'raw/' || w.id::text || '/%'
  ));
