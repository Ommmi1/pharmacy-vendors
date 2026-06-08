/**
 * Shared getServerSideProps wrapper for all protected pages.
 * Handles session check + profile fetch in one place.
 * Usage:
 *   export const getServerSideProps = withAuth()
 *   export const getServerSideProps = withAuth({ requireOnboarded: false })
 */
import { createServerClient } from '@supabase/ssr'
import type { GetServerSideProps, GetServerSidePropsContext } from 'next'
import type { Profile } from './supabase/types'

interface Options {
  /** Redirect to /onboarding if profile.onboarded is false. Default: true */
  requireOnboarded?: boolean
}

export function withAuth(options: Options = {}): GetServerSideProps {
  const { requireOnboarded = true } = options

  return async (ctx: GetServerSidePropsContext) => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get:    (n: string) => ctx.req.cookies[n],
          set:    () => {},
          remove: () => {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return {
        redirect: {
          destination: `/login?next=${ctx.resolvedUrl}`,
          permanent: false,
        },
      }
    }

    // Fetch profile server-side for SSR initial render
    const { supabaseAdmin } = await import('./supabase/server')
    const db = supabaseAdmin as any
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single() as { data: import('./supabase/types').Profile | null }

    if (requireOnboarded && (!profile || !profile.onboarded)) {
      return { redirect: { destination: '/onboarding', permanent: false } }
    }

    return {
      props: {
        profile:  profile as Profile,
        email:    session.user.email ?? '',
      },
    }
  }
}
