import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ToastProvider } from '@/components/ui/Toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from '@/styles/Auth.module.css'

function SignupPage() {
  const [panel,    setPanel]    = useState<'form' | 'verify'>('form')
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) { setError('All fields are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/signup', { fullName, email, password })
      setPanel('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Create Account — MediOrder Pro</title></Head>
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>💊</div>
            <div className={styles.brandName}>MediOrder Pro</div>
            <span className={styles.brandBadge}>Beta</span>
          </div>

          {panel === 'form' && (
            <>
              <h1 className={styles.heading}>Create your account</h1>
              <p  className={styles.sub}>Set up MediOrder Pro for your distribution business</p>
              {error && <div className={styles.alertError}>{error}</div>}
              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <Input label="Full Name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Adnan Samad" autoComplete="name" required />
                <Input label="Business Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
                <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoComplete="new-password" hint="Must be at least 8 characters" required />
                <Button variant="accent" size="lg" type="submit" loading={loading} style={{ width: '100%' }}>
                  Create Account →
                </Button>
              </form>
              <div className={styles.switchRow}>
                Already have an account?
                <Link href="/login" className={styles.link}>Sign in</Link>
              </div>
            </>
          )}

          {panel === 'verify' && (
            <div className={styles.infoBanner}>
              <div className={styles.infoIcon}>📬</div>
              <h2 className={styles.infoTitle}>Check your inbox</h2>
              <p className={styles.infoText}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.</p>
              <Link href="/login" className={styles.link}>← Go to Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function Signup() {
  return <ToastProvider><SignupPage /></ToastProvider>
}
