import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in Client Components (browser).
 *
 * Uses the public NEXT_PUBLIC_ environment variables — safe to expose
 * in browser context. Strongly typed with our database schema.
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data } = await supabase.from('users').select('*')
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
