-- Durable Yjs updates; Supabase Realtime streams inserts to active editors.
-- Run after 009_collaboration_access.sql.

alter table public.branches add constraint branches_identity_unique
  unique (id, workspace_id, artifact_id);

create table public.collaboration_updates (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  artifact_id uuid not null,
  branch_id uuid not null,
  update_base64 text not null check (length(update_base64) between 1 and 8000000),
  is_seed boolean not null default false,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  foreign key (branch_id, workspace_id, artifact_id)
    references public.branches(id, workspace_id, artifact_id) on delete cascade
);

create unique index collaboration_updates_one_seed
  on public.collaboration_updates(branch_id) where is_seed;
create index collaboration_updates_branch_order
  on public.collaboration_updates(branch_id, id);

alter table public.collaboration_updates enable row level security;
grant select, insert on public.collaboration_updates to authenticated;

create policy collaboration_updates_read_members on public.collaboration_updates
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy collaboration_updates_insert_editors on public.collaboration_updates
  for insert to authenticated with check (
    public.can_edit_workspace(workspace_id) and created_by = (select auth.uid())
  );

alter publication supabase_realtime add table public.collaboration_updates;

-- Private Realtime Presence topics are scoped to a workspace.
create policy research_presence_read on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) like 'workspace:%:branch:%'
    and public.is_workspace_member(split_part((select realtime.topic()), ':', 2)::uuid)
  );
create policy research_presence_write on realtime.messages for insert to authenticated
  with check (
    (select realtime.topic()) like 'workspace:%:branch:%'
    and public.is_workspace_member(split_part((select realtime.topic()), ':', 2)::uuid)
  );
