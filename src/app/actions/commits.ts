'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { getArtifactById } from '@/lib/db/artifacts'
import { getBranchById, updateBranchHead } from '@/lib/db/branches'
import { createCommit } from '@/lib/db/commits'
import type { CommitRow } from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface CreateCommitResult {
  commit: CommitRow
  branchId: string
  newHeadCommitId: string
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Server action to create a new snapshot commit on an active branch.
 * Validates inputs, captures current branch HEAD as parent_commit_id,
 * inserts the commit with calculated SHA-256 hash, and advances the branch head pointer.
 */
export async function createCommitAction(
  formData: FormData
): Promise<ActionResult<CreateCommitResult>> {
  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Extract and sanitize inputs
    const rawWorkspaceId = formData.get('workspaceId')
    const rawArtifactId = formData.get('artifactId')
    const rawBranchId = formData.get('branchId')
    const rawContent = formData.get('content')
    const rawMessage = formData.get('message')

    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''
    const artifactId =
      typeof rawArtifactId === 'string' ? rawArtifactId.trim() : ''
    const branchId = typeof rawBranchId === 'string' ? rawBranchId.trim() : ''
    const content = typeof rawContent === 'string' ? rawContent : ''
    const message =
      typeof rawMessage === 'string' && rawMessage.trim()
        ? rawMessage.trim()
        : 'Update artifact'

    // 3. Validate UUID formats
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return { success: false, error: 'A valid workspace ID is required.' }
    }
    if (!artifactId || !UUID_REGEX.test(artifactId)) {
      return { success: false, error: 'A valid artifact ID is required.' }
    }
    if (!branchId || !UUID_REGEX.test(branchId)) {
      return { success: false, error: 'A valid branch ID is required.' }
    }

    if (message.length > 200) {
      return {
        success: false,
        error: 'Commit message must not exceed 200 characters.',
      }
    }

    // 4. Verify workspace exists
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return { success: false, error: 'Target workspace not found.' }
    }

    // 5. Verify artifact exists and belongs to workspace
    const artifact = await getArtifactById(artifactId)
    if (!artifact) {
      return { success: false, error: 'Target artifact not found.' }
    }
    if (artifact.workspace_id !== workspaceId) {
      return {
        success: false,
        error: 'Artifact does not belong to the specified workspace.',
      }
    }

    // 6. Verify branch exists and belongs to artifact
    const branch = await getBranchById(branchId)
    if (!branch) {
      return { success: false, error: 'Target branch not found.' }
    }
    if (branch.artifact_id !== artifactId) {
      return {
        success: false,
        error: 'Branch does not belong to the specified artifact.',
      }
    }

    // 7. Create commit with parent_commit_id = current branch head
    const parentCommitId = branch.head_commit_id
    let commit: CommitRow
    try {
      commit = await createCommit({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        parent_commit_id: parentCommitId,
        merge_parent_id: null,
        content,
        message,
        author_id: user.id,
        is_merge_commit: false,
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to create commit: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 8. Advance the branch head pointer to the new commit
    try {
      await updateBranchHead(branchId, commit.id)
    } catch (err) {
      return {
        success: false,
        error: `Commit created (${commit.id}), but failed to update branch head pointer: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 9. Revalidate routes
    revalidatePath(`/workspaces/${workspaceId}/artifacts/${artifactId}`)
    revalidatePath(`/workspaces/${workspaceId}`)

    return {
      success: true,
      data: {
        commit,
        branchId,
        newHeadCommitId: commit.id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while creating the commit.',
    }
  }
}
