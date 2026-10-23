'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { getWorkspaceById, getWorkspaceMembership } from '@/lib/db/workspaces'
import { createArtifact, deleteArtifact } from '@/lib/db/artifacts'
import { createCommit } from '@/lib/db/commits'
import { createBranch } from '@/lib/db/branches'
import {
  parseArtifact,
  MAX_FILE_SIZE_BYTES,
  type IngestionMetadata,
  type ArtifactType,
} from '@/lib/ingestion'
import type { ArtifactRow, CommitRow, BranchRow } from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface IngestedArtifactPayload {
  artifact: ArtifactRow
  initialCommit: CommitRow
  mainBranch: BranchRow
  metadata: IngestionMetadata
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Server action to ingest a raw file into a research artifact.
 * Workflow:
 * 1. Validate request (user, workspace, membership, file limits)
 * 2. Parse & extract canonical text using parseArtifact()
 * 3. Create Artifact record in DB
 * 4. Attempt raw file upload to Supabase Storage
 * 5. Create immutable Initial Commit (v1.0) with canonical text & SHA-256 hash
 * 6. Initialize default 'main' branch pointing to Initial Commit
 * 7. Multi-step compensation cleanup on any failure
 */
export async function ingestArtifactAction(
  formData: FormData
): Promise<ActionResult<IngestedArtifactPayload>> {
  let createdArtifactId: string | null = null
  let uploadedStoragePath: string | null = null

  try {
    // 1. Resolve demo researcher identity
    const user = await getCurrentDemoUser()

    // 2. Validate workspaceId
    const rawWorkspaceId = formData.get('workspaceId')
    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''

    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return {
        success: false,
        error: 'A valid workspace ID is required.',
        code: 'INVALID_WORKSPACE_ID',
      }
    }

    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return {
        success: false,
        error: 'Target workspace not found.',
        code: 'WORKSPACE_NOT_FOUND',
      }
    }

    // 3. Verify user membership and authorization in target workspace
    const membership = await getWorkspaceMembership(workspaceId, user.id)
    if (!membership || (membership.role !== 'owner' && membership.role !== 'editor')) {
      return {
        success: false,
        error: 'Unauthorized: You do not have editor permissions to import artifacts into this workspace.',
        code: 'UNAUTHORIZED',
      }
    }

    // 4. Extract and validate uploaded file
    const fileEntry = formData.get('file')
    if (!fileEntry || !(fileEntry instanceof File)) {
      return {
        success: false,
        error: 'A valid file must be provided for ingestion.',
        code: 'MISSING_FILE',
      }
    }

    const file = fileEntry as File
    const originalFilename = file.name?.trim() || 'uploaded_document'
    const fileSize = file.size

    if (fileSize === 0) {
      return {
        success: false,
        error: 'The uploaded file is empty.',
        code: 'EMPTY_DOCUMENT',
      }
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 15MB.`,
        code: 'FILE_TOO_LARGE',
      }
    }

    // Convert file to Node Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Optional user custom title override
    const rawCustomTitle = formData.get('title')
    const customTitle =
      typeof rawCustomTitle === 'string' && rawCustomTitle.trim()
        ? rawCustomTitle.trim()
        : null

    // 5. Parse & Normalize Content FIRST before creating DB records
    const parseResult = await parseArtifact({
      buffer,
      filename: originalFilename,
      mimeType: file.type,
      size: fileSize,
    })

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        code: parseResult.code,
      }
    }

    const parsed = parseResult.data
    const finalTitle = customTitle || parsed.title

    // 6. Step A: Create Artifact Record
    let artifact: ArtifactRow
    try {
      artifact = await createArtifact({
        workspace_id: workspaceId,
        name: finalTitle,
        artifact_type: parsed.artifactType as ArtifactType,
        original_filename: originalFilename,
        created_by: user.id,
      })
      createdArtifactId = artifact.id
    } catch (err) {
      return {
        success: false,
        error: `Failed to create artifact record: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'DATABASE_ERROR',
      }
    }

    // 7. Step B: Upload Raw File to Supabase Storage
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `raw/${workspaceId}/${artifact.id}/${safeFilename}`
    const supabase = await createClient()

    try {
      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(storagePath, buffer, {
          contentType: parsed.detectedMimeType,
          upsert: true,
        })

      if (!uploadError) {
        uploadedStoragePath = storagePath
        await supabase
          .from('artifacts')
          .update({ storage_path: storagePath })
          .eq('id', artifact.id)
        artifact.storage_path = storagePath
      } else {
        console.warn(
          `Supabase Storage notice (${storagePath}): ${uploadError.message}. Proceeding with canonical commit snapshot.`
        )
      }
    } catch (storageErr) {
      console.warn('Supabase Storage notice:', storageErr)
    }

    // 8. Step C: Create Initial Commit (Commit v1.0)
    let initialCommit: CommitRow
    try {
      initialCommit = await createCommit({
        workspace_id: workspaceId,
        artifact_id: artifact.id,
        content: parsed.canonicalContent,
        message: `Ingested ${originalFilename}`,
        author_id: user.id,
        parent_commit_id: null,
        merge_parent_id: null,
        is_merge_commit: false,
      })
    } catch (commitErr) {
      // Compensation: remove storage upload and delete orphaned artifact
      if (uploadedStoragePath) {
        await supabase.storage.from('artifacts').remove([uploadedStoragePath]).catch(() => {})
      }
      if (createdArtifactId) {
        await deleteArtifact(createdArtifactId).catch(() => {})
      }
      return {
        success: false,
        error: `Failed to create initial commit snapshot: ${commitErr instanceof Error ? commitErr.message : 'Unknown error'}. Cleaned up uncommitted artifact record.`,
        code: 'COMMIT_CREATION_FAILED',
      }
    }

    // 9. Step D: Initialize default 'main' branch
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
    } catch (branchErr) {
      // Compensation: remove storage upload and delete artifact (cascades to commit)
      if (uploadedStoragePath) {
        await supabase.storage.from('artifacts').remove([uploadedStoragePath]).catch(() => {})
      }
      if (createdArtifactId) {
        await deleteArtifact(createdArtifactId).catch(() => {})
      }
      return {
        success: false,
        error: `Failed to initialize default main branch: ${branchErr instanceof Error ? branchErr.message : 'Unknown error'}. Cleaned up artifact and commit records.`,
        code: 'BRANCH_CREATION_FAILED',
      }
    }

    // 10. Revalidate workspace detail route
    revalidatePath(`/workspaces/${workspaceId}`)

    return {
      success: true,
      data: {
        artifact,
        initialCommit,
        mainBranch,
        metadata: parsed.metadata,
      },
    }
  } catch (error) {
    // Top-level error safety compensation
    if (createdArtifactId) {
      const supabase = await createClient()
      if (uploadedStoragePath) {
        await supabase.storage.from('artifacts').remove([uploadedStoragePath]).catch(() => {})
      }
      await deleteArtifact(createdArtifactId).catch(() => {})
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during artifact ingestion.',
      code: 'INGESTION_FAILED',
    }
  }
}
