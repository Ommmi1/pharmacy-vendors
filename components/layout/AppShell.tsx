import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import type { Profile } from '@/lib/supabase/types'
import styles from './AppShell.module.css'

interface Props {
  profile:  Profile
  email:    string
  children: React.ReactNode
}

function Shell({ profile, email, children }: Props) {
  const router  = useRouter()
  const toast   = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const nav = [
    { href: '/dashboard',   label: 'Dashboard'  },
    { href: '/catalog',     label: 'Catalog'     },
    { href: '/orders',      label: 'Orders'      },
    { href: '/portal-link', label: 'Portal'      },
    { href: '/settings',    label: 'Settings'    },
  ]

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function signOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  async function copyPortalLink() {
    if (!profile.slug) { toast('error', 'Set a URL slug in Settings first.'); return }
    const link = `${window.location.origin}/portal/${profile.slug}`
    await navigator.clipboard.writeText(link)
    toast('success', 'Pharmacy link copied!')
  }

  const initials = (profile.biz_name || email)[0].toUpperCase()

  return (
    <div className={styles.shell}>
      {/* TOPBAR */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>💊</div>
          <span className={styles.brandName}>MediOrder Pro</span>
          <span className={styles.brandPlan}>Beta</span>
        </div>

        <nav className={styles.nav}>
          {nav.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.navItem} ${router.pathname === n.href ? styles.navActive : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className={styles.right} ref={menuRef}>
          <button
            className={styles.userBtn}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Account menu"
          >
            <span className={styles.avatar}>{initials}</span>
            <span className={styles.userName}>{profile.biz_name || email}</span>
            <span className={styles.chevron}>▾</span>
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>{email}</div>
              <hr className={styles.dropdownDivider} />
              <Link href="/settings" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                ⚙️ Settings
              </Link>
              <button className={styles.dropdownItem} onClick={copyPortalLink}>
                🔗 Copy Pharmacy Link
              </button>
              <hr className={styles.dropdownDivider} />
              <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={signOut}>
                Sign Out →
              </button>
            </div>
          )}
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className={styles.main}>
        {children}
      </main>

      {/* MOBILE NAV */}
      <nav className={styles.mobileNav}>
        {nav.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`${styles.mobileNavItem} ${router.pathname === n.href ? styles.mobileNavActive : ''}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default function AppShell(props: Props) {
  return (
    <ToastProvider>
      <Shell {...props} />
    </ToastProvider>
  )
}
