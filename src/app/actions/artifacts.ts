'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { createArtifact } from '@/lib/db/artifacts'
import { createCommit } from '@/lib/db/commits'
import { createBranch } from '@/lib/db/branches'
import type {
  ArtifactRow,
  CommitRow,
  BranchRow,
  ArtifactType,
} from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface CreatedArtifactPayload {
  artifact: ArtifactRow
  initialCommit: CommitRow
  mainBranch: BranchRow
}

const VALID_ARTIFACT_TYPES: ArtifactType[] = [
  'markdown',
  'pdf',
  'chatgpt_export',
  'claude_export',
  'codebase',
]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Server action to create and initialize a new research artifact.
 * Coordinates:
 * 1. Artifact record creation
 * 2. Initial commit (Commit v1) creation with initial content and SHA-256 hash
 * 3. Default 'main' branch initialization pointing to the initial commit
 */
export async function createArtifactAction(
  formData: FormData
): Promise<ActionResult<CreatedArtifactPayload>> {
  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Extract and sanitize inputs
    const rawWorkspaceId = formData.get('workspaceId')
    const rawName = formData.get('name')
    const rawArtifactType = formData.get('artifactType')
    const rawOriginalFilename = formData.get('originalFilename')
    const rawInitialContent = formData.get('initialContent')

    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const artifactType =
      typeof rawArtifactType === 'string'
        ? (rawArtifactType.trim() as ArtifactType)
        : ('markdown' as ArtifactType)
    const originalFilename =
      typeof rawOriginalFilename === 'string' && rawOriginalFilename.trim()
        ? rawOriginalFilename.trim()
        : null
    const initialContent =
      typeof rawInitialContent === 'string' ? rawInitialContent : ''

    // 3. Server-side validation
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return { success: false, error: 'A valid workspace ID is required.' }
    }

    if (!name) {
      return { success: false, error: 'Artifact name is required.' }
    }

    if (name.length > 150) {
      return {
        success: false,
        error: 'Artifact name must not exceed 150 characters.',
      }
    }

    if (!VALID_ARTIFACT_TYPES.includes(artifactType)) {
      return {
        success: false,
        error: `Invalid artifact type. Must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`,
      }
    }

    // 4. Verify target workspace exists
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return { success: false, error: 'Target workspace not found.' }
    }

    // 5. Step A: Create Artifact record
    let artifact: ArtifactRow
    try {
      artifact = await createArtifact({
        workspace_id: workspaceId,
        name,
        artifact_type: artifactType,
        original_filename: originalFilename,
        created_by: user.id,
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to create artifact: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 6. Step B: Create Initial Commit (Commit v1)
    let initialCommit: CommitRow
    try {
      initialCommit = await createCommit({
        workspace_id: workspaceId,
        artifact_id: artifact.id,
        content: initialContent,
        message: 'Initial version',
        author_id: user.id,
        parent_commit_id: null,
        merge_parent_id: null,
        is_merge_commit: false,
      })
    } catch (err) {
      return {
        success: false,
        error: `Artifact record created (${artifact.id}), but initial commit failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 7. Step C: Create Default 'main' Branch pointing to initial commit
    let mainBranch: BranchRow
    try {
      mainBranch = await createBranch({
        workspace_id: workspaceId,
        artifact_id: artifact.id,
        name: 'main',
        head_commit_id: initialCommit.id,
        created_from_commit_id: initialCommit.id,
        created_by: user.id,
        is_default: true,
      })
    } catch (err) {
      return {
        success: false,
        error: `Artifact and initial commit created, but main branch initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 8. Revalidate workspace detail route
    revalidatePath(`/workspaces/${workspaceId}`)

    return {
      success: true,
      data: {
        artifact,
        initialCommit,
        mainBranch,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while creating the artifact.',
    }
  }
}
