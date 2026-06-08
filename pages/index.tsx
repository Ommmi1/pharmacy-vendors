import { GetServerSideProps } from 'next'
import { createServerClient } from '@supabase/ssr'

export default function Home() { return null }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => ctx.req.cookies[n], set: () => {}, remove: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return {
    redirect: {
      destination: session ? '/dashboard' : '/login',
      permanent: false,
    },
  }
}
