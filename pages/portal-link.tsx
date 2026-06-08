import { useState } from 'react'
import Head from 'next/head'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { withAuth } from '@/lib/withAuth'
import type { Profile } from '@/lib/supabase/types'
import styles from '@/styles/PortalLink.module.css'

interface Props { profile: Profile; email: string }

function PortalLinkPage({ profile, email }: Props) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const portalUrl = profile.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${profile.slug}`
    : null

  async function copy() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    toast('success', 'Pharmacy link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const features = [
    {
      icon: '💊',
      title: 'Full Catalog',
      body: 'Pharmacies browse your complete medicine list with live discounts and bonus offers, grouped by company.',
    },
    {
      icon: '🛒',
      title: 'One-tap Ordering',
      body: 'Enter quantities, see real-time totals and savings, download a PDF — no account required.',
    },
    {
      icon: '📊',
      title: 'Instant Dashboard',
      body: 'Every submitted order appears in your dashboard immediately with full line-item detail.',
    },
    {
      icon: '🔒',
      title: 'Server-side Prices',
      body: 'Prices are always fetched from your database. Pharmacies cannot manipulate order amounts.',
    },
  ]

  return (
    <AppShell profile={profile} email={email}>
      <Head><title>Pharmacy Portal — MediOrder Pro</title></Head>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pharmacy Portal</h1>
          <p className={styles.sub}>Share this link with your pharmacy and hospital clients — no login required</p>
        </div>
      </div>

      {/* LINK CARD */}
      <div className={styles.linkCard}>
        <div className={styles.linkLabel}>Your Pharmacy Order Link</div>
        {portalUrl ? (
          <div className={styles.linkRow}>
            <div className={styles.shareBox}>
              <input className={styles.shareInput} type="text" value={portalUrl} readOnly />
              <button className={`${styles.shareBtn} ${copied ? styles.shareBtnCopied : ''}`} onClick={copy}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <a href={portalUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">↗ Open</Button>
            </a>
          </div>
        ) : (
          <div className={styles.noSlug}>
            <span className={styles.noSlugIcon}>⚠️</span>
            <div>
              <strong>No URL slug set.</strong> Go to{' '}
              <a href="/settings">Settings</a> to add one and activate your portal.
            </div>
          </div>
        )}
        <p className={styles.linkHint}>
          Anyone with this link can browse your catalog and place orders. No sign-up needed for pharmacies.
        </p>
      </div>

      {/* FEATURE HIGHLIGHTS */}
      <div className={styles.features}>
        {features.map(f => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <div className={styles.featureTitle}>{f.title}</div>
            <div className={styles.featureBody}>{f.body}</div>
          </div>
        ))}
      </div>

      {/* PORTAL PREVIEW */}
      {portalUrl && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewTitle}>Live Preview</div>
            <a href={portalUrl} target="_blank" rel="noreferrer">
              <Button variant="subtle" size="sm">Open in new tab ↗</Button>
            </a>
          </div>
          <div className={styles.previewWrap}>
            <div className={styles.browserBar}>
              <div className={styles.browserDots}>
                <span /><span /><span />
              </div>
              <div className={styles.browserUrl}>{portalUrl}</div>
            </div>
            <iframe
              className={styles.previewFrame}
              src={portalUrl}
              title="Portal Preview"
            />
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default function PortalLink(props: Props) {
  return <ToastProvider><PortalLinkPage {...props} /></ToastProvider>
}

export const getServerSideProps = withAuth()
