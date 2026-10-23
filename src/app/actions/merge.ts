'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentDemoUser } from '@/lib/auth/demo-user'
import { getWorkspaceById } from '@/lib/db/workspaces'
import { getArtifactById } from '@/lib/db/artifacts'
import { getBranchById, updateBranchHead } from '@/lib/db/branches'
import { getCommitById, getCommitHistory, createCommit } from '@/lib/db/commits'
import {
  createMergeRecord,
  getMergeRecordById,
  updateMergeStatus,
  resolveConflict,
} from '@/lib/db/merge'
import {
  performThreeWayMerge,
  findLowestCommonAncestor,
  hasUnresolvedConflictMarkers,
  type DiffChunk,
  type MergeConflict,
} from '@/lib/diff/semantic-diff'
import type {
  MergeRecordRow,
  BranchRow,
  CommitRow,
} from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface PrepareMergeResult {
  mergeRecord: MergeRecordRow
  sourceBranch: BranchRow
  targetBranch: BranchRow
  sourceHeadCommit: CommitRow
  targetHeadCommit: CommitRow
  commonAncestorCommit: CommitRow | null
  hasConflicts: boolean
  mergedContent: string
  conflicts: MergeConflict[]
  diffAgainstBase: {
    targetDiff: DiffChunk[]
    sourceDiff: DiffChunk[]
  }
  diffTargetVsSource: DiffChunk[]
}

export interface CompleteMergeResult {
  mergeRecord: MergeRecordRow
  mergeCommit: CommitRow
  targetBranch: BranchRow
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Prepares a merge between two branches:
 * 1. Validates entities and branch relationships
 * 2. Identifies common ancestor commit
 * 3. Runs 3-way merge and semantic diff analysis
 * 4. Inserts a merge_records row in pending/conflict status
 */
export async function prepareMergeAction(
  formData: FormData
): Promise<ActionResult<PrepareMergeResult>> {
  try {
    const user = await getCurrentDemoUser()

    const rawWorkspaceId = formData.get('workspaceId')
    const rawArtifactId = formData.get('artifactId')
    const rawSourceBranchId = formData.get('sourceBranchId')
    const rawTargetBranchId = formData.get('targetBranchId')

    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''
    const artifactId =
      typeof rawArtifactId === 'string' ? rawArtifactId.trim() : ''
    const sourceBranchId =
      typeof rawSourceBranchId === 'string' ? rawSourceBranchId.trim() : ''
    const targetBranchId =
      typeof rawTargetBranchId === 'string' ? rawTargetBranchId.trim() : ''

    // 1. Validate UUIDs
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return { success: false, error: 'A valid workspace ID is required.' }
    }
    if (!artifactId || !UUID_REGEX.test(artifactId)) {
      return { success: false, error: 'A valid artifact ID is required.' }
    }
    if (!sourceBranchId || !UUID_REGEX.test(sourceBranchId)) {
      return { success: false, error: 'A valid source branch ID is required.' }
    }
    if (!targetBranchId || !UUID_REGEX.test(targetBranchId)) {
      return { success: false, error: 'A valid target branch ID is required.' }
    }

    if (sourceBranchId === targetBranchId) {
      return {
        success: false,
        error: 'Cannot merge a branch into itself. Please select distinct branches.',
      }
    }

    // 2. Verify workspace and artifact
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return { success: false, error: 'Target workspace not found.' }
    }

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

    // 3. Verify source and target branches
    const sourceBranch = await getBranchById(sourceBranchId)
    if (!sourceBranch) {
      return { success: false, error: 'Source branch not found.' }
    }
    if (sourceBranch.artifact_id !== artifactId) {
      return {
        success: false,
        error: 'Source branch does not belong to this artifact.',
      }
    }
    if (!sourceBranch.head_commit_id) {
      return {
        success: false,
        error: 'Source branch does not have an active HEAD commit.',
      }
    }

    const targetBranch = await getBranchById(targetBranchId)
    if (!targetBranch) {
      return { success: false, error: 'Target branch not found.' }
    }
    if (targetBranch.artifact_id !== artifactId) {
      return {
        success: false,
        error: 'Target branch does not belong to this artifact.',
      }
    }
    if (!targetBranch.head_commit_id) {
      return {
        success: false,
        error: 'Target branch does not have an active HEAD commit.',
      }
    }

    // 4. Fetch HEAD commits and ancestor history in parallel
    const [sourceHeadCommit, targetHeadCommit, sourceHistory, targetHistory] =
      await Promise.all([
        getCommitById(sourceBranch.head_commit_id),
        getCommitById(targetBranch.head_commit_id),
        getCommitHistory(sourceBranch.head_commit_id),
        getCommitHistory(targetBranch.head_commit_id),
      ])

    if (!sourceHeadCommit) {
      return { success: false, error: 'Source HEAD commit not found.' }
    }
    if (!targetHeadCommit) {
      return { success: false, error: 'Target HEAD commit not found.' }
    }

    // 5. Find common ancestor
    const commonAncestorCommit = findLowestCommonAncestor(
      targetHistory,
      sourceHistory
    )

    const baseCommitId =
      commonAncestorCommit?.id || targetHeadCommit.parent_commit_id || targetHeadCommit.id
    const baseContent = commonAncestorCommit?.content ?? ''
    const targetContent = targetHeadCommit.content
    const sourceContent = sourceHeadCommit.content

    // 6. Execute 3-way merge algorithm
    const mergeResult = performThreeWayMerge(
      baseContent,
      targetContent,
      sourceContent
    )

    // 7. Persist merge record
    let mergeRecord: MergeRecordRow
    try {
      mergeRecord = await createMergeRecord({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        source_branch_id: sourceBranchId,
        target_branch_id: targetBranchId,
        base_commit_id: baseCommitId,
        source_commit_id: sourceHeadCommit.id,
        target_commit_id: targetHeadCommit.id,
        status: mergeResult.hasConflicts ? 'conflict' : 'pending',
        conflict_content: mergeResult.hasConflicts
          ? mergeResult.mergedContent
          : null,
        initiated_by: user.id,
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to create merge record: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    return {
      success: true,
      data: {
        mergeRecord,
        sourceBranch,
        targetBranch,
        sourceHeadCommit,
        targetHeadCommit,
        commonAncestorCommit,
        hasConflicts: mergeResult.hasConflicts,
        mergedContent: mergeResult.mergedContent,
        conflicts: mergeResult.conflicts,
        diffAgainstBase: mergeResult.diffAgainstBase,
        diffTargetVsSource: mergeResult.diffTargetVsSource,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while preparing the merge.',
    }
  }
}

/**
 * Completes a merge:
 * 1. Validates resolved text does not contain conflict markers
 * 2. Verifies branches have not advanced since preparation (stale merge protection)
 * 3. Creates the merge commit with parent_commit_id (target) and merge_parent_id (source)
 * 4. Advances target branch HEAD pointer
 * 5. Updates merge_records status to resolved/success
 */
export async function completeMergeAction(
  formData: FormData
): Promise<ActionResult<CompleteMergeResult>> {
  try {
    const user = await getCurrentDemoUser()

    const rawWorkspaceId = formData.get('workspaceId')
    const rawArtifactId = formData.get('artifactId')
    const rawMergeRecordId = formData.get('mergeRecordId')
    const rawResolvedContent = formData.get('resolvedContent')
    const rawCommitMessage = formData.get('commitMessage')

    const workspaceId =
      typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : ''
    const artifactId =
      typeof rawArtifactId === 'string' ? rawArtifactId.trim() : ''
    const mergeRecordId =
      typeof rawMergeRecordId === 'string' ? rawMergeRecordId.trim() : ''
    const resolvedContent =
      typeof rawResolvedContent === 'string' ? rawResolvedContent : ''
    const commitMessage =
      typeof rawCommitMessage === 'string' ? rawCommitMessage.trim() : ''

    // 1. Validate UUIDs
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return { success: false, error: 'A valid workspace ID is required.' }
    }
    if (!artifactId || !UUID_REGEX.test(artifactId)) {
      return { success: false, error: 'A valid artifact ID is required.' }
    }
    if (!mergeRecordId || !UUID_REGEX.test(mergeRecordId)) {
      return { success: false, error: 'A valid merge record ID is required.' }
    }

    if (!commitMessage) {
      return { success: false, error: 'Merge commit message is required.' }
    }
    if (commitMessage.length > 200) {
      return {
        success: false,
        error: 'Commit message must not exceed 200 characters.',
      }
    }

    // 2. Validate resolved content does not contain raw conflict markers
    if (hasUnresolvedConflictMarkers(resolvedContent)) {
      return {
        success: false,
        error:
          'Cannot complete merge with unresolved conflict markers (<<<<<<<, =======, >>>>>>>). Please resolve all conflicts before completing the merge.',
      }
    }

    // 3. Fetch and verify merge record
    const mergeRecord = await getMergeRecordById(mergeRecordId)
    if (!mergeRecord) {
      return { success: false, error: 'Merge record not found.' }
    }
    if (
      mergeRecord.workspace_id !== workspaceId ||
      mergeRecord.artifact_id !== artifactId
    ) {
      return {
        success: false,
        error: 'Merge record does not match the requested workspace or artifact.',
      }
    }
    if (mergeRecord.status === 'resolved' || mergeRecord.status === 'success') {
      return {
        success: false,
        error: `Merge is already ${mergeRecord.status}. Cannot re-merge.`,
      }
    }

    // 4. Verify source and target branches
    const [targetBranch, sourceBranch] = await Promise.all([
      getBranchById(mergeRecord.target_branch_id),
      getBranchById(mergeRecord.source_branch_id),
    ])

    if (!targetBranch || !targetBranch.head_commit_id) {
      return {
        success: false,
        error: 'Target branch or its HEAD commit could not be found.',
      }
    }
    if (!sourceBranch || !sourceBranch.head_commit_id) {
      return {
        success: false,
        error: 'Source branch or its HEAD commit could not be found.',
      }
    }

    // 5. Stale Merge Protection: Verify branches haven't moved since preparation
    if (targetBranch.head_commit_id !== mergeRecord.target_commit_id) {
      return {
        success: false,
        error:
          'Target branch HEAD has moved since this merge was prepared. Please re-prepare the merge to compare against the latest target branch commit.',
      }
    }
    if (sourceBranch.head_commit_id !== mergeRecord.source_commit_id) {
      return {
        success: false,
        error:
          'Source branch HEAD has moved since this merge was prepared. Please re-prepare the merge to include the latest source branch changes.',
      }
    }

    // 6. Step A: Create Merge Commit with both parent references
    let mergeCommit: CommitRow
    try {
      mergeCommit = await createCommit({
        workspace_id: workspaceId,
        artifact_id: artifactId,
        parent_commit_id: targetBranch.head_commit_id,
        merge_parent_id: sourceBranch.head_commit_id,
        is_merge_commit: true,
        content: resolvedContent,
        message: commitMessage,
        author_id: user.id,
      })
    } catch (err) {
      return {
        success: false,
        error: `Failed to create merge commit: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 7. Step B: Advance target branch HEAD to merge commit
    try {
      await updateBranchHead(targetBranch.id, mergeCommit.id)
    } catch (err) {
      return {
        success: false,
        error: `Merge commit created (${mergeCommit.id}), but failed to advance target branch HEAD: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 8. Step C: Finalize merge_records row
    let updatedMergeRecord: MergeRecordRow
    try {
      if (mergeRecord.status === 'conflict') {
        updatedMergeRecord = await resolveConflict(
          mergeRecord.id,
          resolvedContent,
          mergeCommit.id
        )
      } else {
        updatedMergeRecord = await updateMergeStatus(
          mergeRecord.id,
          'success',
          mergeCommit.id
        )
      }
    } catch (err) {
      return {
        success: false,
        error: `Merge commit created and branch advanced, but failed to finalize merge record: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }

    // 9. Revalidate routes
    revalidatePath(`/workspaces/${workspaceId}/artifacts/${artifactId}`)
    revalidatePath(`/workspaces/${workspaceId}`)

    return {
      success: true,
      data: {
        mergeRecord: updatedMergeRecord,
        mergeCommit,
        targetBranch: {
          ...targetBranch,
          head_commit_id: mergeCommit.id,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while completing the merge.',
    }
  }
}
