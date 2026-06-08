/**
 * Browser-side Supabase client.
 * Uses ONLY the anon key — which has zero privileges beyond RLS policies.
 * This client's ONLY job is managing the auth session cookie.
 * All actual data operations go through /api/* routes (server-side).
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
