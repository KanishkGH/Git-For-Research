'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { success: false; error: string }

export async function addWorkspaceMemberAction(
  workspaceId: string,
  email: string,
  role: 'editor' | 'viewer'
): Promise<ActionResult> {
  try {
    await getCurrentUser()
    if (!email.trim() || !email.includes('@')) throw new Error('Enter a valid email address.')
    const supabase = await createClient()
    const { error } = await supabase.rpc('add_workspace_member_by_email', {
      target_workspace_id: workspaceId,
      target_email: email.trim(),
      target_role: role,
    })
    if (error) throw new Error(error.message)
    revalidatePath(`/workspaces/${workspaceId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not add member.' }
  }
}

export async function removeWorkspaceMemberAction(
  workspaceId: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace || workspace.owner_id !== user.id) throw new Error('Only the owner can remove members.')
    const supabase = await createClient()
    const { error } = await supabase.from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .neq('role', 'owner')
    if (error) throw new Error(error.message)
    revalidatePath(`/workspaces/${workspaceId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not remove member.' }
  }
}
