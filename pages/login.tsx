import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { createClient } from '@/lib/supabase/client'
import s from '@/styles/Login.module.css'

export default function Login() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Enter email and password.'); return }
    setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/dashboard')
  }

  return (
    <>
      <Head><title>Admin Login — MediOrder Pro</title></Head>
      <div className={s.screen}>
        <div className={s.card}>
          <div className={s.brand}>
            <div className={s.mark}>💊</div>
            <div>
              <div className={s.name}>MediOrder Pro</div>
              <div className={s.role}>Admin Panel</div>
            </div>
          </div>

          <h1 className={s.heading}>Sign in</h1>
          <p className={s.sub}>Authorized personnel only</p>

          {error && <div className={s.alert}>{error}</div>}

          <form onSubmit={handleSubmit} className={s.form} noValidate>
            <div className={s.field}>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com" autoComplete="email" required />
            </div>
            <div className={s.field}>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)} />
            </div>
            <button className={s.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
