import * as Y from 'yjs'
import { createClient } from '@/lib/supabase/server'

/** Carry a completed merge into the branch's live draft. */
export async function syncMergeToLiveDraft(
  workspaceId: string,
  artifactId: string,
  branchId: string,
  content: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  const doc = new Y.Doc()
  let hasUpdates = false

  try {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('collaboration_updates')
        .select('update_base64')
        .eq('branch_id', branchId)
        .order('id', { ascending: true })
        .range(offset, offset + 499)
      if (error) throw new Error(`Could not load the live draft: ${error.message}`)
      for (const row of data ?? []) {
        Y.applyUpdate(doc, Buffer.from(row.update_base64, 'base64'))
        hasUpdates = true
      }
      if (!data || data.length < 500) break
    }

    // If nobody has opened this branch yet, its first editor will seed it from
    // the new merge commit instead.
    if (!hasUpdates) return

    const text = doc.getText('content')
    if (text.toString() === content) return
    const before = Y.encodeStateVector(doc)
    doc.transact(() => {
      text.delete(0, text.length)
      text.insert(0, content)
    })
    const update = Y.encodeStateAsUpdate(doc, before)
    const { error } = await supabase.from('collaboration_updates').insert({
      workspace_id: workspaceId,
      artifact_id: artifactId,
      branch_id: branchId,
      update_base64: Buffer.from(update).toString('base64'),
      created_by: userId,
    })
    if (error) throw new Error(`Could not update the live draft: ${error.message}`)
  } finally {
    doc.destroy()
  }
}
