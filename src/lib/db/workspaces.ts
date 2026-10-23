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

  // 1. Create workspace
  const { data: createdWorkspace, error: wsError } = await supabase
    .from('workspaces')
    .insert(workspace)
    .select()
    .single()

  if (wsError) {
    throw new Error(`Failed to create workspace: ${wsError.message}`)
  }

  // 2. Automatically register creator as 'owner' in workspace_members
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: createdWorkspace.id,
      user_id: createdWorkspace.owner_id,
      role: 'owner',
    })

  if (memberError) {
    throw new Error(`Failed to add workspace owner membership: ${memberError.message}`)
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
