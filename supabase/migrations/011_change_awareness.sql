-- Last seen branch heads for per-researcher change awareness.
-- Run after 010_collaborative_editing.sql.

create table public.artifact_views (
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  last_seen_commit_id uuid references public.commits(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

alter table public.artifact_views enable row level security;
grant select, insert, update on public.artifact_views to authenticated;
create policy artifact_views_read_self on public.artifact_views for select to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy artifact_views_insert_self on public.artifact_views for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy artifact_views_update_self on public.artifact_views for update to authenticated
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
