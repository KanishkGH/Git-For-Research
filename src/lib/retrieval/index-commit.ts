import { createClient } from '@/lib/supabase/server'
import type { CommitRow, CommitChunkInsert } from '@/types/database'
import { chunkContent } from './chunk-content'
import { createEmbeddings, embeddingModel } from './openai'

const BATCH_SIZE = 20

/** Index one small batch, so a large commit can finish over multiple requests. */
export async function indexCommitBatch(commit: CommitRow): Promise<{
  indexed: number
  total: number
}> {
  const supabase = await createClient()
  const chunks = chunkContent(commit.content)
  if (chunks.length === 0) {
    await markIndexed(commit.id)
    return { indexed: 0, total: 0 }
  }

  const indexed = new Set<number>()
  for (let offset = 0; ; offset += 1000) {
    const { data: existing, error: readError } = await supabase
      .from('commit_chunks')
      .select('chunk_index')
      .eq('commit_id', commit.id)
      .order('chunk_index')
      .range(offset, offset + 999)
    if (readError) throw new Error(`Failed to read search index: ${readError.message}`)
    for (const row of existing ?? []) indexed.add(row.chunk_index)
    if (!existing || existing.length < 1000) break
  }
  const pending = chunks.filter((chunk) => !indexed.has(chunk.index)).slice(0, BATCH_SIZE)
  if (pending.length === 0) {
    await markIndexed(commit.id)
    return { indexed: indexed.size, total: chunks.length }
  }

  const embeddings = await createEmbeddings(pending.map((chunk) => chunk.content))
  const rows: CommitChunkInsert[] = pending.map((chunk, index) => ({
    workspace_id: commit.workspace_id,
    artifact_id: commit.artifact_id,
    commit_id: commit.id,
    chunk_index: chunk.index,
    start_offset: chunk.startOffset,
    end_offset: chunk.endOffset,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[index]),
    embedding_model: embeddingModel,
  }))

  const { error: writeError } = await supabase
    .from('commit_chunks')
    .upsert(rows, { onConflict: 'commit_id,chunk_index' })
  if (writeError) throw new Error(`Failed to save search index: ${writeError.message}`)

  const indexedCount = indexed.size + pending.length
  if (indexedCount >= chunks.length) await markIndexed(commit.id)
  return { indexed: indexedCount, total: chunks.length }
}

async function markIndexed(commitId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('commits')
    .update({ search_indexed_at: new Date().toISOString() })
    .eq('id', commitId)
  if (error) throw new Error(`Failed to mark commit indexed: ${error.message}`)
}
