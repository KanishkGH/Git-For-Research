import { createClient } from '@/lib/supabase/server'
import type { BranchInsert, BranchRow } from '@/types/database'

/**
 * Creates a new branch for an artifact.
 */
export async function createBranch(branch: BranchInsert): Promise<BranchRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .insert(branch)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create branch '${branch.name}': ${error.message}`)
  }

  return data
}

/**
 * Retrieves a branch by its UUID.
 */
export async function getBranchById(id: string): Promise<BranchRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch branch by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Retrieves a specific named branch for an artifact (e.g. 'main', 'experiment').
 */
export async function getBranchByName(
  artifactId: string,
  name: string
): Promise<BranchRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('artifact_id', artifactId)
    .eq('name', name)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch branch by name ('${name}'): ${error.message}`)
  }

  return data
}

/**
 * Lists all branches belonging to a specific artifact.
 */
export async function listArtifactBranches(artifactId: string): Promise<BranchRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('artifact_id', artifactId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to list branches for artifact (${artifactId}): ${error.message}`)
  }

  return data ?? []
}

/**
 * Updates the head_commit_id pointer of a branch to advance its HEAD.
 */
export async function updateBranchHead(
  branchId: string,
  headCommitId: string
): Promise<BranchRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branches')
    .update({ head_commit_id: headCommitId })
    .eq('id', branchId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update branch head (${branchId} -> ${headCommitId}): ${error.message}`)
  }

  return data
}
