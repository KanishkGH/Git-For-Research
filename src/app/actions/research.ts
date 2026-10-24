'use server'

import { getCurrentUser } from '@/lib/auth/current-user'
import { getWorkspaceById, getWorkspaceMembership } from '@/lib/db/workspaces'
import { createClient } from '@/lib/supabase/server'
import { indexCommitBatch } from '@/lib/retrieval/index-commit'
import { answerFromSources, createEmbeddings } from '@/lib/retrieval/openai'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireWorkspaceAccess(workspaceId: string) {
  if (!UUID_REGEX.test(workspaceId)) throw new Error('Invalid workspace ID.')
  const user = await getCurrentUser()
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace) throw new Error('Workspace not found.')
  const membership = await getWorkspaceMembership(workspaceId, user.id)
  if (!membership) throw new Error('You do not have access to this workspace.')
  return membership
}

export async function indexNextResearchBatchAction(
  workspaceId: string
): Promise<ActionResult<{ done: boolean; commitId?: string; indexed?: number; total?: number }>> {
  try {
    const membership = await requireWorkspaceAccess(workspaceId)
    if (membership.role === 'viewer') throw new Error('Viewers cannot update the search index.')
    const supabase = await createClient()
    const { data: commit, error } = await supabase.from('commits')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('search_indexed_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to find unindexed commits: ${error.message}`)
    if (!commit) return { success: true, data: { done: true } }

    const progress = await indexCommitBatch(commit)
    return {
      success: true,
      data: {
        done: false,
        commitId: commit.id,
        indexed: progress.indexed,
        total: progress.total,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Indexing failed.' }
  }
}

export interface ResearchSource {
  number: number
  artifactId: string
  artifactName: string
  commitId: string
  commitCreatedAt: string
  startOffset: number
  endOffset: number
  excerpt: string
  similarity: number
}

export async function askResearchAction(
  workspaceId: string,
  question: string
): Promise<ActionResult<{ answer: string; sources: ResearchSource[] }>> {
  try {
    await requireWorkspaceAccess(workspaceId)
    const cleanQuestion = question.trim()
    if (!cleanQuestion || cleanQuestion.length > 1000) {
      throw new Error('Enter a question between 1 and 1000 characters.')
    }

    const [embedding] = await createEmbeddings([cleanQuestion])
    const supabase = await createClient()
    const { data: matches, error } = await supabase.rpc('search_commit_chunks', {
      search_workspace_id: workspaceId,
      query_embedding: JSON.stringify(embedding),
      match_count: 8,
    })
    if (error) throw new Error(`Research search failed: ${error.message}`)
    if (!matches?.length) {
      return {
        success: true,
        data: { answer: 'No indexed research was found. Index this workspace first.', sources: [] },
      }
    }

    const sources: ResearchSource[] = matches.map((match, index) => ({
      number: index + 1,
      artifactId: match.artifact_id,
      artifactName: match.artifact_name,
      commitId: match.commit_id,
      commitCreatedAt: match.commit_created_at,
      startOffset: match.start_offset,
      endOffset: match.end_offset,
      excerpt: match.content,
      similarity: match.similarity,
    }))
    const answer = await answerFromSources(cleanQuestion, sources.map((source) => ({
      label: source.number,
      artifactName: source.artifactName,
      commitId: source.commitId,
      content: source.excerpt,
    })))
    return { success: true, data: { answer, sources } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Research query failed.' }
  }
}
