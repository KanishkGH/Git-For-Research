'use server'

import * as Y from 'yjs'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getBranchById } from '@/lib/db/branches'
import { getCommitById } from '@/lib/db/commits'
import { getWorkspaceMembership } from '@/lib/db/workspaces'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/** Create the branch's Yjs baseline exactly once before clients load updates. */
export async function ensureCollaborationSeedAction(
  workspaceId: string,
  artifactId: string,
  branchId: string
): Promise<ActionResult<{ userId: string; displayName: string }>> {
  try {
    const user = await getCurrentUser()
    const member = await getWorkspaceMembership(workspaceId, user.id)
    if (!member) throw new Error('You do not have access to this workspace.')
    const branch = await getBranchById(branchId)
    if (!branch || branch.workspace_id !== workspaceId || branch.artifact_id !== artifactId) {
      throw new Error('Branch not found in this artifact.')
    }

    const supabase = await createClient()
    const { data: existing, error: readError } = await supabase
      .from('collaboration_updates')
      .select('id')
      .eq('branch_id', branchId)
      .eq('is_seed', true)
      .limit(1)
      .maybeSingle()
    if (readError) throw new Error(readError.message)

    if (!existing) {
      if (member.role === 'viewer') throw new Error('An editor must open this branch before viewers can join.')
      const head = branch.head_commit_id ? await getCommitById(branch.head_commit_id) : null
      const doc = new Y.Doc()
      doc.getText('content').insert(0, head?.content ?? '')
      const update = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
      doc.destroy()
      const { error: insertError } = await supabase.from('collaboration_updates').insert({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        branch_id: branchId,
        update_base64: update,
        is_seed: true,
        created_by: user.id,
      })
      // A second editor may have inserted the unique seed concurrently.
      if (insertError && insertError.code !== '23505') throw new Error(insertError.message)
    }

    return { success: true, data: { userId: user.id, displayName: user.display_name } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not open live editor.' }
  }
}
