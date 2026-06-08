/**
 * Server-side Supabase client.
 * Uses the SERVICE_ROLE_KEY — full database access, bypasses RLS where needed.
 * This file is ONLY imported in /pages/api/* (server-side).
 * It is never bundled into the browser.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
