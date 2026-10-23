'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { getArtifactById } from '@/lib/db/artifacts'
import { getCommitById } from '@/lib/db/commits'
import { createBranch, getBranchByName } from '@/lib/db/branches'
import type { BranchRow } from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Server action to create a new exploration branch for an artifact.
 * Validates inputs, verifies source commit belongs to artifact, checks name uniqueness,
 * and creates the branch pointing to fromCommitId.
 */
export async function createBranchAction(
  formData: FormData
): Promise<ActionResult<BranchRow>> {
  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Extract and sanitize inputs
    const rawWorkspaceId = formData.get('workspaceId')
    const rawArtifactId = formData.get('artifactId')
    const rawName = formData.get('name')
    const rawFromCommitId = formData.get('fromCommitId')

    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''
    const artifactId =
      typeof rawArtifactId === 'string' ? rawArtifactId.trim() : ''
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const fromCommitId =
      typeof rawFromCommitId === 'string' ? rawFromCommitId.trim() : ''

    // 3. Validate UUID formats
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return { success: false, error: 'A valid workspace ID is required.' }
    }
    if (!artifactId || !UUID_REGEX.test(artifactId)) {
      return { success: false, error: 'A valid artifact ID is required.' }
    }
    if (!fromCommitId || !UUID_REGEX.test(fromCommitId)) {
      return { success: false, error: 'A valid source commit ID is required.' }
    }

    // 4. Validate branch name format and length
    if (!name) {
      return { success: false, error: 'Branch name is required.' }
    }
    if (name.length > 100) {
      return {
        success: false,
        error: 'Branch name must not exceed 100 characters.',
      }
    }
    if (!/^[a-zA-Z0-9_\-\./]+$/.test(name)) {
      return {
        success: false,
        error: 'Branch name can only contain letters, numbers, underscores, dashes, dots, and slashes.',
      }
    }

    // 5. Verify workspace exists
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return { success: false, error: 'Target workspace not found.' }
    }

    // 6. Verify artifact exists and belongs to workspace
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

    // 7. Verify source commit exists and belongs to this artifact
    const sourceCommit = await getCommitById(fromCommitId)
    if (!sourceCommit) {
      return { success: false, error: 'Source commit not found.' }
    }
    if (sourceCommit.artifact_id !== artifactId) {
      return {
        success: false,
        error: 'Source commit does not belong to the specified artifact.',
      }
    }

    // 8. Check for duplicate branch name on this artifact
    const existingBranch = await getBranchByName(artifactId, name)
    if (existingBranch) {
      return {
        success: false,
        error: `A branch named '${name}' already exists for this artifact.`,
      }
    }

    // 9. Create the new branch pointing to fromCommitId
    let branch: BranchRow
    try {
      branch = await createBranch({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        name,
        head_commit_id: fromCommitId,
        created_from_commit_id: fromCommitId,
        created_by: user.id,
        is_default: false,
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to create branch: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 10. Revalidate routes
    revalidatePath(`/workspaces/${workspaceId}/artifacts/${artifactId}`)

    return {
      success: true,
      data: branch,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while creating the branch.',
    }
  }
}
