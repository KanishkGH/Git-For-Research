import { createClient } from '@/lib/supabase/server'
import { createUser, getUserById } from '@/lib/db/users'
import type { UserRow } from '@/types/database'

/** Resolve the signed-in Supabase user to this app's researcher record. */
export async function getCurrentUser(): Promise<UserRow> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    throw new Error('Please sign in to continue.')
  }

  const existing = await getUserById(user.id)
  if (existing) return existing

  try {
    return await createUser({
      id: user.id,
      email: user.email,
      display_name: user.email.split('@')[0],
    })
  } catch (createError) {
    // A second request may have created the record concurrently.
    const created = await getUserById(user.id)
    if (created) return created
    throw createError
  }
}
