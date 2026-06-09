import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => req.cookies[n],
        set: () => {},
        remove: () => {},
      },
    }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

export function handleError(res: NextApiResponse, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unexpected error'
  console.error(msg)
  return res.status(500).json({ error: msg })
}
