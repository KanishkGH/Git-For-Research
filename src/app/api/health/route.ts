import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * Minimal Supabase connection health check.
 *
 * Verifies that:
 * 1. NEXT_PUBLIC_SUPABASE_URL is configured
 * 2. NEXT_PUBLIC_SUPABASE_ANON_KEY is configured
 * 3. The Supabase server client can be initialized without errors
 *
 * NOTE: This does NOT perform a database query because no schema exists yet.
 * A real database round-trip will be verified after the first schema is created.
 * This endpoint will be removed or replaced once the application is built.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check environment variables are present
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Missing Supabase environment variables',
        checks: {
          NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
        },
      },
      { status: 500 }
    )
  }

  try {
    // Attempt to initialize the server client
    const supabase = await createClient()

    // Verify the URL is well-formed (a misconfigured URL would throw above)
    const urlIsValid = supabaseUrl.startsWith('https://')

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase client initialized successfully',
      checks: {
        NEXT_PUBLIC_SUPABASE_URL: true,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
        urlFormat: urlIsValid,
        clientInitialized: !!supabase,
      },
      // Never expose actual key values — only confirm presence
      supabaseProject: supabaseUrl.replace('https://', '').split('.')[0],
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Supabase client initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
