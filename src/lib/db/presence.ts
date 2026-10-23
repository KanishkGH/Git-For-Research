import { createClient } from '@/lib/supabase/server'
import type {
  PresenceSessionInsert,
  PresenceSessionRow,
  UserRow,
} from '@/types/database'

/**
 * UPSERTs an active user presence session for an artifact.
 * Uses the UNIQUE (user_id, artifact_id) constraint to update last_seen_at and status.
 */
export async function upsertPresenceSession(
  session: PresenceSessionInsert
): Promise<PresenceSessionRow> {
  const supabase = await createClient()

  const payload: PresenceSessionInsert = {
    ...session,
    last_seen_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('presence_sessions')
    .upsert(payload, {
      onConflict: 'user_id, artifact_id',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert presence session: ${error.message}`)
  }

  return data
}

export type ActivePresenceSessionWithUser = PresenceSessionRow & {
  users: UserRow | null
}

/**
 * Retrieves all active presence sessions for an artifact.
 * Active sessions are defined as those with last_seen_at within the last 30 seconds.
 */
export async function getActivePresenceSessions(
  artifactId: string
): Promise<ActivePresenceSessionWithUser[]> {
  const supabase = await createClient()

  // Calculate threshold timestamp: 30 seconds ago
  const activeThreshold = new Date(Date.now() - 30 * 1000).toISOString()

  const { data, error } = await supabase
    .from('presence_sessions')
    .select('*, users(*)')
    .eq('artifact_id', artifactId)
    .gt('last_seen_at', activeThreshold)
    .order('last_seen_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch active presence for artifact (${artifactId}): ${error.message}`)
  }

  return (data as unknown as ActivePresenceSessionWithUser[]) ?? []
}
