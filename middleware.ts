import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

// Routes that require authentication
const PROTECTED = ['/dashboard', '/catalog', '/orders', '/settings', '/onboarding']
// Routes that authenticated users should not see
const AUTH_ONLY = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient(request, response)

  // Refresh session if expired — keeps cookie alive
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected pages
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup
  const isAuthOnly = AUTH_ONLY.some(p => pathname.startsWith(p))
  if (isAuthOnly && session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
