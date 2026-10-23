import { createClient } from '@/lib/supabase/server'
import type { ArtifactInsert, ArtifactRow } from '@/types/database'

/**
 * Creates a new artifact record in a workspace.
 */
export async function createArtifact(artifact: ArtifactInsert): Promise<ArtifactRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artifacts')
    .insert(artifact)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create artifact: ${error.message}`)
  }

  return data
}

/**
 * Retrieves an artifact by its UUID.
 */
export async function getArtifactById(id: string): Promise<ArtifactRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch artifact by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Lists all artifacts within a specific workspace.
 */
export async function listWorkspaceArtifacts(workspaceId: string): Promise<ArtifactRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list artifacts for workspace (${workspaceId}): ${error.message}`)
  }

  return data ?? []
}

/**
 * Deletes an artifact by its UUID (used for partial-state compensation/cleanup).
 */
export async function deleteArtifact(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('artifacts')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete artifact (${id}): ${error.message}`)
  }
}
