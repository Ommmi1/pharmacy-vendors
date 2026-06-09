import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { createClient } from '@/lib/supabase/client'
import s from './AdminShell.module.css'

interface Props {
  title?: string
  children: React.ReactNode
}

export default function AdminShell({ title, children }: Props) {
  const router  = useRouter()
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function signOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {title && <Head><title>{title} — MediOrder Pro</title></Head>}
      <div className={s.shell}>
        <header className={s.topbar}>
          <Link href="/dashboard" className={s.brand}>
            <div className={s.mark}>💊</div>
            <span className={s.name}>MediOrder Pro</span>
            <span className={s.badge}>Admin</span>
          </Link>
          <nav className={s.nav}>
            <Link href="/dashboard" className={`${s.navItem} ${router.pathname === '/dashboard' ? s.active : ''}`}>
              Distributors
            </Link>
          </nav>
          <div className={s.right} ref={menuRef}>
            <button className={s.userBtn} onClick={() => setMenu(v => !v)}>
              <span className={s.avatar}>A</span>
              <span className={s.chevron}>▾</span>
            </button>
            {menu && (
              <div className={s.dropdown}>
                <button className={`${s.ddItem} ${s.danger}`} onClick={signOut}>Sign Out →</button>
              </div>
            )}
          </div>
        </header>
        <main className={s.main}>{children}</main>
      </div>
    </>
  )
}
