import { createClient } from '@/lib/supabase/server'
import type { MergeRecordInsert, MergeRecordRow, MergeStatus } from '@/types/database'

/**
 * Creates a new merge record (defaults to 'pending' status).
 */
export async function createMergeRecord(
  record: MergeRecordInsert
): Promise<MergeRecordRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('merge_records')
    .insert(record)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create merge record: ${error.message}`)
  }

  return data
}

/**
 * Retrieves a merge record by its UUID.
 */
export async function getMergeRecordById(id: string): Promise<MergeRecordRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('merge_records')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch merge record by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Updates the status (and optional result commit) of a merge record.
 */
export async function updateMergeStatus(
  id: string,
  status: MergeStatus,
  resultCommitId?: string | null
): Promise<MergeRecordRow> {
  const supabase = await createClient()
  const payload: Partial<MergeRecordRow> = { status }
  if (resultCommitId !== undefined) {
    payload.result_commit_id = resultCommitId
  }

  const { data, error } = await supabase
    .from('merge_records')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update merge status (${id} -> ${status}): ${error.message}`)
  }

  return data
}

/**
 * Records a conflict state on a merge record, storing the formatted conflict content.
 */
export async function recordConflict(
  id: string,
  conflictContent: string
): Promise<MergeRecordRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('merge_records')
    .update({
      status: 'conflict',
      conflict_content: conflictContent,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to record conflict on merge (${id}): ${error.message}`)
  }

  return data
}

/**
 * Marks a conflict as resolved, storing the resolved text, setting resolved_at timestamp,
 * and linking the resulting merge commit.
 */
export async function resolveConflict(
  id: string,
  resolvedContent: string,
  resultCommitId: string
): Promise<MergeRecordRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('merge_records')
    .update({
      status: 'resolved',
      resolved_content: resolvedContent,
      result_commit_id: resultCommitId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to resolve merge conflict (${id}): ${error.message}`)
  }

  return data
}
