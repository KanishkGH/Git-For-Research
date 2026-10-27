-- Let a workspace owner read the row immediately after inserting it.
-- The member-based SELECT policy calls a STABLE helper that cannot see a
-- workspace created earlier in the same INSERT ... RETURNING statement.
-- A direct owner check also makes workspace access independent of the owner
-- membership row during initial creation.
drop policy if exists workspaces_read_owner on public.workspaces;
create policy workspaces_read_owner on public.workspaces
  for select to authenticated
  using (owner_id = (select auth.uid()));
