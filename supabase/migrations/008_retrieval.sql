-- Searchable chunks of immutable commit snapshots.
-- Run after 007_private_access.sql.

create extension if not exists vector with schema extensions;

alter table public.commits add column search_indexed_at timestamptz;

create table public.commit_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  commit_id uuid not null references public.commits(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset > start_offset),
  content text not null check (length(content) > 0),
  embedding extensions.vector(1536) not null,
  embedding_model text not null default 'text-embedding-3-small',
  created_at timestamptz not null default now(),
  unique (commit_id, chunk_index)
);

create index commit_chunks_workspace_idx on public.commit_chunks(workspace_id);
create index commit_chunks_commit_idx on public.commit_chunks(commit_id);

alter table public.commit_chunks enable row level security;
grant select, insert, update, delete on public.commit_chunks to authenticated;

create policy commit_chunks_owner on public.commit_chunks for all to authenticated
  using (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  ));

-- SECURITY INVOKER preserves the table's row-level access policy.
create function public.search_commit_chunks(
  search_workspace_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 8
)
returns table (
  chunk_id uuid,
  artifact_id uuid,
  artifact_name text,
  commit_id uuid,
  commit_created_at timestamptz,
  chunk_index integer,
  start_offset integer,
  end_offset integer,
  content text,
  similarity double precision
)
language sql stable security invoker
set search_path = ''
as $$
  select cc.id, cc.artifact_id, a.name, cc.commit_id, c.created_at,
         cc.chunk_index, cc.start_offset, cc.end_offset, cc.content,
         1 - (cc.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.commit_chunks cc
  join public.artifacts a on a.id = cc.artifact_id
  join public.commits c on c.id = cc.commit_id
  where cc.workspace_id = search_workspace_id
  order by cc.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.search_commit_chunks(uuid, extensions.vector, integer) from public, anon;
grant execute on function public.search_commit_chunks(uuid, extensions.vector, integer) to authenticated;
