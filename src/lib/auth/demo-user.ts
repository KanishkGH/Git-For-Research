import { getUserById, createUser } from '@/lib/db/users'
import type { UserInsert, UserRow } from '@/types/database'

/**
 * Deterministic Demo Researcher Identity.
 * Used during development and hackathon demos while authentication is deferred.
 */
export const DEMO_RESEARCHER: UserInsert = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'researcher@lab.org',
  display_name: 'Dr. Sarah Chen (Lead Researcher)',
  avatar_url: null,
} as const

/**
 * Checks whether the demo researcher exists in the database.
 * If missing, automatically creates the user record using the typed data-access layer.
 * Returns the existing or newly created UserRow.
 */
export async function ensureDemoUser(): Promise<UserRow> {
  try {
    const existing = await getUserById(DEMO_RESEARCHER.id!)
    if (existing) {
      return existing
    }

    // User does not exist, insert demo user
    return await createUser(DEMO_RESEARCHER)
  } catch (error) {
    // If concurrent insert or query error occurs, attempt a fallback lookup
    const fallback = await getUserById(DEMO_RESEARCHER.id!)
    if (fallback) {
      return fallback
    }
    throw new Error(
      `Failed to ensure demo user: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Retrieves the current active demo researcher identity.
 * Isolated abstraction ready to be swapped with real Supabase Auth later.
 */
export async function getCurrentDemoUser(): Promise<UserRow> {
  return ensureDemoUser()
}
