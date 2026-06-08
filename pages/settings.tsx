import { useState } from 'react'
import Head from 'next/head'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { withAuth } from '@/lib/withAuth'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import styles from '@/styles/Settings.module.css'

interface Props { profile: Profile; email: string }

function SettingsPage({ profile: initialProfile, email }: Props) {
  const toast = useToast()

  const [profile, setProfile] = useState(initialProfile)
  const [saving,  setSaving]  = useState(false)
  const [resetting, setResetting] = useState(false)

  // Form fields
  const [bizName,   setBizName]   = useState(profile.biz_name  || '')
  const [phone,     setPhone]     = useState(profile.phone     || '')
  const [city,      setCity]      = useState(profile.city      || '')
  const [address,   setAddress]   = useState(profile.address   || '')
  const [whatsapp,  setWhatsapp]  = useState(profile.whatsapp  || '')
  const [lowLevel,  setLowLevel]  = useState(String(profile.low_level ?? 10))
  const [slug,      setSlug]      = useState(profile.slug      || '')
  const [slugError, setSlugError] = useState('')

  function handleSlugInput(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
    setSlugError('')
  }

  async function saveProfile() {
    if (!bizName.trim()) { toast('error', 'Business name is required.'); return }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setSlugError('Lowercase letters, numbers, and hyphens only.')
      return
    }
    setSaving(true)
    try {
      const updated = await api.patch<Profile>('/api/profile', {
        biz_name:  bizName.trim(),
        phone:     phone.trim(),
        city:      city.trim(),
        address:   address.trim(),
        whatsapp:  whatsapp.trim(),
        low_level: parseInt(lowLevel) || 10,
        ...(slug ? { slug: slug.trim() } : {}),
      })
      setProfile(updated)
      toast('success', 'Settings saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save.'
      if (msg.toLowerCase().includes('slug')) setSlugError(msg)
      else toast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function sendPasswordReset() {
    setResetting(true)
    try {
      const sb = createClient()
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast('success', 'Password reset email sent — check your inbox.')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to send reset email.')
    } finally {
      setResetting(false)
    }
  }

  const portalUrl = profile.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${profile.slug}`
    : null

  return (
    <AppShell profile={profile} email={email}>
      <Head><title>Settings — MediOrder Pro</title></Head>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.sub}>Manage your distributor profile and account preferences</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>

          {/* BUSINESS PROFILE */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Business Profile</h2>
              <p className={styles.sectionSub}>This information appears on your public pharmacy portal.</p>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.formGrid}>
                <Input
                  label="Business Name *"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  placeholder="Shelf Pharma"
                />
                <Input
                  label="Contact Phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="03007774353"
                />
                <Input
                  label="City"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Karachi"
                />
                <Input
                  label="Low Stock Alert Level"
                  type="number"
                  value={lowLevel}
                  onChange={e => setLowLevel(e.target.value)}
                  placeholder="10"
                  hint="Medicines below this stock level are flagged"
                />
              </div>
              <Input
                label="Business Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="PECHS Ext. Block 6, Karachi"
                style={{ marginBottom: 12 }}
              />
              <Input
                label="WhatsApp Number"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="923001234567 (with country code, no +)"
                hint="Used for direct contact from your portal (optional)"
              />
              <div className={styles.saveRow}>
                <Button variant="accent" loading={saving} onClick={saveProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </section>

          {/* PORTAL URL */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Pharmacy Portal URL</h2>
              <p className={styles.sectionSub}>
                Your unique URL slug. Changing it will break any existing links you've shared.
              </p>
            </div>
            <div className={styles.sectionBody}>
              <Input
                label="URL Slug"
                value={slug}
                onChange={handleSlugInput}
                placeholder="shelf-pharma"
                mono
                error={slugError}
                hint={slug && !slugError ? `Portal URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${slug}` : undefined}
              />
              {portalUrl && (
                <div className={styles.currentSlug}>
                  <span className={styles.currentSlugLabel}>Current portal link:</span>
                  <a href={portalUrl} target="_blank" rel="noreferrer" className={styles.currentSlugLink}>
                    {portalUrl}
                  </a>
                </div>
              )}
              <div className={styles.saveRow}>
                <Button variant="accent" loading={saving} onClick={saveProfile}>
                  Update Slug
                </Button>
              </div>
            </div>
          </section>

        </div>

        <div className={styles.sideCol}>

          {/* ACCOUNT */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Account</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.accountEmail}>
                <div className={styles.accountEmailLabel}>Signed in as</div>
                <div className={styles.accountEmailValue}>{email}</div>
              </div>
              <div className={styles.accountActions}>
                <Button
                  variant="subtle"
                  size="sm"
                  loading={resetting}
                  onClick={sendPasswordReset}
                  style={{ width: '100%' }}
                >
                  📧 Send Password Reset Email
                </Button>
              </div>
            </div>
          </section>

          {/* STATS */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Account Info</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Plan</span>
                <span className={styles.infoBadge}>Free Beta</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Member since</span>
                <span className={styles.infoValue}>
                  {new Date(profile.created_at).toLocaleDateString('en-PK', {
                    month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Portal status</span>
                <span className={profile.slug ? styles.infoActive : styles.infoInactive}>
                  {profile.slug ? '● Active' : '○ Not configured'}
                </span>
              </div>
            </div>
          </section>

          {/* DANGER ZONE */}
          <section className={`${styles.section} ${styles.dangerSection}`}>
            <div className={styles.sectionHeader}>
              <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Danger Zone</h2>
            </div>
            <div className={styles.sectionBody}>
              <p className={styles.dangerText}>
                To delete your account and all data, contact support. This action is irreversible.
              </p>
              <Button variant="red" size="sm" onClick={() => toast('info', 'Contact support@mediorderpro.com to delete your account.')}>
                Request Account Deletion
              </Button>
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  )
}

export default function Settings(props: Props) {
  return <ToastProvider><SettingsPage {...props} /></ToastProvider>
}

export const getServerSideProps = withAuth()
