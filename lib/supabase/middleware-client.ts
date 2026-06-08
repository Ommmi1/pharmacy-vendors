import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
    cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) { response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]) },
        remove(name: string, options: Record<string, unknown>) { response.cookies.set(name, '', options as Parameters<typeof response.cookies.set>[2]) },
      },
    }
  )
}
