import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and API Route Handlers.
 *
 * Uses the public NEXT_PUBLIC_ environment variables + reads/writes cookies
 * via Next.js `next/headers` so that auth sessions are preserved across
 * server-side renders. Strongly typed with our database schema.
 *
 * IMPORTANT: This function must only be called in a server context.
 * Do NOT import this in Client Components — use @/lib/supabase/client instead.
 *
 * Usage:
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('users').select('*')
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies cannot be set
            // during render. The middleware handles cookie refresh instead.
          }
        },
      },
    }
  )
}
