import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import type {
  WorkspaceInsert,
  WorkspaceMemberInsert,
  WorkspaceMemberRow,
  WorkspaceRow,
  UserRow,
} from '@/types/database'

/**
 * Creates a new workspace and automatically adds the creator as an 'owner' member.
 */
export async function createWorkspace(workspace: WorkspaceInsert): Promise<WorkspaceRow> {
  const supabase = await createClient()
  const workspaceId = randomUUID()

  // Insert without RETURNING. The SELECT policy calls a STABLE membership
  // function, which cannot see this row until the insert statement finishes.
  const { error: wsError } = await supabase
    .from('workspaces')
    .insert({ ...workspace, id: workspaceId })

  if (wsError) {
    throw new Error(`Failed to create workspace: ${wsError.message}`)
  }

  // Register the creator as an owner after the workspace is visible.
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: workspace.owner_id,
      role: 'owner',
    })

  if (memberError) {
    // Avoid leaving a workspace that the owner cannot see in the dashboard.
    await supabase.from('workspaces').delete().eq('id', workspaceId)
    throw new Error(`Failed to add workspace owner membership: ${memberError.message}`)
  }

  const { data: createdWorkspace, error: readError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()
  if (readError) {
    throw new Error(`Workspace was created but could not be loaded: ${readError.message}`)
  }

  return createdWorkspace
}

/**
 * Retrieves a workspace by its UUID.
 */
export async function getWorkspaceById(id: string): Promise<WorkspaceRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch workspace by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Lists all workspaces that a user belongs to (as owner, editor, or viewer).
 */
export async function listUserWorkspaces(userId: string): Promise<WorkspaceRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to list workspaces for user (${userId}): ${error.message}`)
  }

  return (data ?? [])
    .map((item) => item.workspaces as unknown as WorkspaceRow)
    .filter(Boolean)
}

/**
 * Adds a member to a workspace with a specified role.
 */
export async function addWorkspaceMember(
  member: WorkspaceMemberInsert
): Promise<WorkspaceMemberRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .insert(member)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add workspace member: ${error.message}`)
  }

  return data
}

export type WorkspaceMemberWithUser = WorkspaceMemberRow & {
  users: UserRow | null
}

/**
 * Lists all members of a workspace along with their user profile details.
 */
export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberWithUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, users(*)')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get workspace members (${workspaceId}): ${error.message}`)
  }

  return (data as unknown as WorkspaceMemberWithUser[]) ?? []
}

/**
 * Checks whether a specific user is a registered member of a workspace.
 */
export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check workspace membership: ${error.message}`)
  }

  return data
}
