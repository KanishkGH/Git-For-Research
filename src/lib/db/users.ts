import { createClient } from '@/lib/supabase/server'
import type { UserInsert, UserRow } from '@/types/database'

/**
 * Retrieves a user by their UUID.
 */
export async function getUserById(id: string): Promise<UserRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch user by id (${id}): ${error.message}`)
  }

  return data
}

/**
 * Retrieves a user by their unique email address.
 */
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch user by email (${email}): ${error.message}`)
  }

  return data
}

/**
 * Creates a new user record.
 */
export async function createUser(user: UserInsert): Promise<UserRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return data
}

/**
 * Lists all users in the system.
 */
export async function listUsers(): Promise<UserRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`)
  }

  return data ?? []
}
