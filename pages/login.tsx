import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from '@/styles/Auth.module.css'

type Panel = 'signin' | 'forgot' | 'forgot-sent'

function LoginPage() {
  const router = useRouter()
  const toast  = useToast()
  const [panel,    setPanel]    = useState<Panel>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    const next = (router.query.next as string) || '/dashboard'
    router.push(next)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) { setError('Enter your email address.'); return }
    setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setPanel('forgot-sent')
  }

  return (
    <>
      <Head><title>Sign In — MediOrder Pro</title></Head>
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>💊</div>
            <div>
              <div className={styles.brandName}>MediOrder Pro</div>
            </div>
            <span className={styles.brandBadge}>Beta</span>
          </div>

          {panel === 'signin' && (
            <>
              <h1 className={styles.heading}>Welcome back</h1>
              <p  className={styles.sub}>Sign in to your distributor account</p>
              {error && <div className={styles.alertError}>{error}</div>}
              <form onSubmit={handleSignIn} className={styles.form} noValidate>
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
                <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                <Button variant="accent" size="lg" type="submit" loading={loading} style={{ width: '100%' }}>
                  Sign In →
                </Button>
              </form>
              <div className={styles.switchRow}>
                <button className={styles.linkBtn} onClick={() => { setPanel('forgot'); setError('') }}>Forgot password?</button>
                <span className={styles.switchDot}>·</span>
                <span>No account?</span>
                <Link href="/signup" className={styles.link}>Sign up free</Link>
              </div>
            </>
          )}

          {panel === 'forgot' && (
            <>
              <h1 className={styles.heading}>Reset password</h1>
              <p className={styles.sub}>Enter your email and we'll send a reset link.</p>
              {error && <div className={styles.alertError}>{error}</div>}
              <form onSubmit={handleForgot} className={styles.form} noValidate>
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
                <Button variant="accent" size="lg" type="submit" loading={loading} style={{ width: '100%' }}>
                  Send Reset Link →
                </Button>
              </form>
              <div className={styles.switchRow}>
                <button className={styles.linkBtn} onClick={() => { setPanel('signin'); setError('') }}>← Back to Sign In</button>
              </div>
            </>
          )}

          {panel === 'forgot-sent' && (
            <div className={styles.infoBanner}>
              <div className={styles.infoIcon}>📬</div>
              <h2 className={styles.infoTitle}>Check your inbox</h2>
              <p className={styles.infoText}>We sent a reset link to <strong>{email}</strong>. Click it to set a new password.</p>
              <button className={styles.linkBtn} onClick={() => { setPanel('signin'); setError('') }}>← Back to Sign In</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function Login() {
  return <ToastProvider><LoginPage /></ToastProvider>
}
