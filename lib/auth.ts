import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from './supabase/server'
import type { Profile } from './supabase/types'

/**
 * Extracts the authenticated user from a request's session cookie.
 * Used in every protected API route.
 * Returns null if unauthenticated — caller must handle the 401.
 */
export async function getAuthUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                                    { return req.cookies[name] },
        set(name: string, value: string, opts: Record<string, unknown>)  { res.setHeader('Set-Cookie', serialize(name, value, opts)) },
        remove(name: string, opts: Record<string, unknown>)              { res.setHeader('Set-Cookie', serialize(name, '', opts)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Gets the full profile for a user.
 * Uses the admin client so we can read profiles for any user (e.g. portal lookup).
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const db = getSupabaseAdmin() as any
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

/**
 * Standard 401 response helper.
 */
export function unauthorized(res: NextApiResponse) {
  return res.status(401).json({ error: 'Unauthorized' })
}

/**
 * Standard error handler for API routes.
 */
export function handleError(res: NextApiResponse, error: unknown) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  console.error('[API Error]', message)
  return res.status(500).json({ error: message })
}

// Minimal cookie serializer (avoids dependency on external cookie lib)
function serialize(name: string, value: string, options: Record<string, unknown> = {}) {
  let str = `${name}=${encodeURIComponent(value)}`
  if (options.maxAge)   str += `; Max-Age=${options.maxAge}`
  if (options.domain)   str += `; Domain=${options.domain}`
  if (options.path)     str += `; Path=${options.path ?? '/'}`
  if (options.expires)  str += `; Expires=${(options.expires as Date).toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  if (options.secure)   str += `; Secure`
  if (options.sameSite) str += `; SameSite=${options.sameSite}`
  return str
}
