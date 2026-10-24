'use server'

import { getCurrentUser } from '@/lib/auth/current-user'
import { getBranchById } from '@/lib/db/branches'
import { getCommitById } from '@/lib/db/commits'
import { getWorkspaceMembership } from '@/lib/db/workspaces'
import { computeSemanticDiff } from '@/lib/diff/semantic-diff'
import { createClient } from '@/lib/supabase/server'

type ChangeSummary = { additions: number; deletions: number; excerpts: string[] }
type ActionResult = { success: true; data: ChangeSummary | null } | { success: false; error: string }

export async function getChangesSinceLastVisitAction(
  workspaceId: string,
  artifactId: string,
  branchId: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!await getWorkspaceMembership(workspaceId, user.id)) throw new Error('Workspace access denied.')
    const branch = await getBranchById(branchId)
    if (!branch || branch.workspace_id !== workspaceId || branch.artifact_id !== artifactId) {
      throw new Error('Branch not found.')
    }

    const supabase = await createClient()
    const { data: view, error: readError } = await supabase.from('artifact_views')
      .select('last_seen_commit_id')
      .eq('user_id', user.id)
      .eq('branch_id', branchId)
      .maybeSingle()
    if (readError) throw new Error(readError.message)

    const { error: saveError } = await supabase.from('artifact_views').upsert({
      user_id: user.id,
      workspace_id: workspaceId,
      artifact_id: artifactId,
      branch_id: branchId,
      last_seen_commit_id: branch.head_commit_id,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,branch_id' })
    if (saveError) throw new Error(saveError.message)

    if (!view?.last_seen_commit_id || view.last_seen_commit_id === branch.head_commit_id) {
      return { success: true, data: null }
    }
    const [previous, current] = await Promise.all([
      getCommitById(view.last_seen_commit_id),
      branch.head_commit_id ? getCommitById(branch.head_commit_id) : null,
    ])
    if (!previous || !current || previous.artifact_id !== artifactId) {
      return { success: true, data: null }
    }

    if (previous.content.length > 100000 || current.content.length > 100000) {
      return { success: true, data: { additions: 0, deletions: 0, excerpts: ['The document changed. Open commit history to inspect the full diff.'] } }
    }
    const diff = computeSemanticDiff(previous.content, current.content)
    return {
      success: true,
      data: {
        additions: diff.filter((chunk) => chunk.type === 'addition').length,
        deletions: diff.filter((chunk) => chunk.type === 'deletion').length,
        excerpts: diff.filter((chunk) => chunk.type !== 'unchanged')
          .slice(0, 3).map((chunk) => `${chunk.type === 'addition' ? 'Added' : 'Removed'}: ${chunk.content.slice(0, 180)}`),
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not load changes.' }
  }
}
