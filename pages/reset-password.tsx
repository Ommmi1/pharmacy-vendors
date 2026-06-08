import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from '@/styles/Auth.module.css'

function ResetPage() {
  const router = useRouter()
  const toast  = useToast()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    // Supabase sends the recovery token in the URL fragment
    // The browser client handles it automatically on mount
    const sb = createClient()
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    toast('success', 'Password updated successfully.')
    router.push('/dashboard')
  }

  return (
    <>
      <Head><title>Reset Password — MediOrder Pro</title></Head>
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>💊</div>
            <div className={styles.brandName}>MediOrder Pro</div>
          </div>

          {!ready ? (
            <div className={styles.infoBanner}>
              <div className={styles.infoIcon}>⏳</div>
              <h2 className={styles.infoTitle}>Verifying reset link…</h2>
              <p className={styles.infoText}>Please wait while we verify your reset link.</p>
            </div>
          ) : (
            <>
              <h1 className={styles.heading}>Set new password</h1>
              <p className={styles.sub}>Choose a strong password for your account.</p>
              {error && <div className={styles.alertError}>{error}</div>}
              <form onSubmit={handleReset} className={styles.form} noValidate>
                <Input label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoFocus hint="At least 8 characters" />
                <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
                <Button variant="accent" size="lg" type="submit" loading={loading} style={{ width: '100%' }}>
                  Update Password →
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ResetPassword() {
  return <ToastProvider><ResetPage /></ToastProvider>
}
