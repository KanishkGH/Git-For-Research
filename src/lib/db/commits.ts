import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { CommitInsert, CommitRow } from '@/types/database'

/**
 * Computes a deterministic SHA-256 hash of content string.
 */
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

export type CreateCommitInput = Omit<CommitInsert, 'content_hash'> & {
  content_hash?: string
}

/**
 * Creates a new immutable commit snapshot.
 * Automatically computes SHA-256 content_hash if not explicitly provided.
 */
export async function createCommit(input: CreateCommitInput): Promise<CommitRow> {
  const supabase = await createClient()

  const payload: CommitInsert = {
    ...input,
    content_hash: input.content_hash ?? computeContentHash(input.content),
  }

  const { data, error } = await supabase
    .from('commits')
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create commit: ${error.message}`)
  }

  return data
}

/**
 * Retrieves a single commit by its UUID.
 */
export async function getCommitById(id: string): Promise<CommitRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('commits')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch commit by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Traverses commit history backwards along the parent_commit_id chain
 * starting from a specific commit (e.g. a branch head).
 * Implemented in application layer without database-side recursive functions.
 */
export async function getCommitHistory(
  startCommitId: string,
  limit: number = 50
): Promise<CommitRow[]> {
  const history: CommitRow[] = []
  let currentId: string | null = startCommitId
  const visited = new Set<string>()

  while (currentId && history.length < limit && !visited.has(currentId)) {
    visited.add(currentId)
    const commit: CommitRow | null = await getCommitById(currentId)
    if (!commit) break

    history.push(commit)
    currentId = commit.parent_commit_id
  }

  return history
}
