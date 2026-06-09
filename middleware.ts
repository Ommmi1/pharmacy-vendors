import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/dashboard', '/distributors']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => request.cookies.get(n)?.value,
        set: (n: string, v: string, o: Record<string, unknown>) =>
          response.cookies.set(n, v, o as Parameters<typeof response.cookies.set>[2]),
        remove: (n: string, o: Record<string, unknown>) =>
          response.cookies.set(n, '', o as Parameters<typeof response.cookies.set>[2]),
      },
    }
  )
  const { data: { session } } = await sb.auth.getSession()
  const isProtected = PROTECTED.some(p => request.nextUrl.pathname.startsWith(p))
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (request.nextUrl.pathname === '/login' && session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|portal/).*)'],
}
