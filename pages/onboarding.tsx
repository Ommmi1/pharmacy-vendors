import { useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { createServerClient } from '@supabase/ssr'
import { api } from '@/lib/api'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Profile } from '@/lib/supabase/types'
import styles from '@/styles/Onboarding.module.css'
import Papa from 'papaparse'

interface Props { profile: Profile; email: string }

type Step = 1 | 2 | 3

function OnboardingPage({ profile, email }: Props) {
  const router = useRouter()
  const toast  = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,    setStep]    = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Step 1 fields
  const [bizName, setBizName] = useState(profile.biz_name || '')
  const [phone,   setPhone]   = useState(profile.phone    || '')
  const [city,    setCity]    = useState(profile.city     || '')
  const [slug,    setSlug]    = useState(profile.slug     || '')
  const [address, setAddress] = useState(profile.address  || '')

  // Step 2 fields
  const [csvRows,    setCsvRows]    = useState<Record<string,string>[]>([])
  const [csvPreview, setCsvPreview] = useState('')
  const [importing,  setImporting]  = useState(false)

  // Step 3 — share link
  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${slug}`
    : ''

  function handleSlugInput(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
  }

  async function saveProfile() {
    setError('')
    if (!bizName.trim()) { setError('Business name is required.'); return }
    if (!phone.trim())   { setError('Phone number is required.'); return }
    if (!slug.trim())    { setError('URL slug is required.'); return }
    if (!/^[a-z0-9-]+$/.test(slug)) { setError('Slug can only contain lowercase letters, numbers, and hyphens.'); return }

    setLoading(true)
    try {
      await api.patch<Profile>('/api/profile', {
        biz_name: bizName.trim(),
        phone:    phone.trim(),
        city:     city.trim(),
        address:  address.trim(),
        slug:     slug.trim(),
      })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.filter(r => r.name && r.tp)
        setCsvRows(rows)
        if (rows.length === 0) {
          setCsvPreview('No valid rows found. Columns needed: name, tp (and optionally: code, company, disc, bonus, stock)')
        } else {
          setCsvPreview(`✓ ${rows.length} medicines ready to import. First: ${rows[0].name}`)
        }
      },
      error: () => setCsvPreview('Failed to parse CSV. Make sure it is a valid CSV file.'),
    })
  }

  async function importAndContinue() {
    if (csvRows.length > 0) {
      setImporting(true)
      try {
        const { inserted } = await api.post<{ inserted: number }>('/api/medicines/import', {
          medicines: csvRows.map(r => ({
            code:    r.code    || '',
            name:    r.name,
            company: r.company || '',
            tp:      parseFloat(r.tp)   || 0,
            disc:    parseFloat(r.disc) || 0,
            bonus:   r.bonus   || '',
            stock:   parseInt(r.stock)  || 999,
          })),
        })
        toast('success', `${inserted} medicines imported.`)
      } catch (err) {
        toast('error', err instanceof Error ? err.message : 'Import failed.')
      } finally {
        setImporting(false)
      }
    }
    await finishOnboarding()
  }

  async function finishOnboarding() {
    await api.patch('/api/profile', { onboarded: true })
    setStep(3)
  }

  async function goToDashboard() {
    router.push('/dashboard')
  }

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: 'Business Profile' },
    { n: 2, label: 'Medicine Catalog' },
    { n: 3, label: 'You\'re Ready'    },
  ]

  return (
    <>
      <Head><title>Setup — MediOrder Pro</title></Head>
      <div className={styles.screen}>
        <div className={styles.card}>

          {/* BRAND */}
          <div className={styles.brand}>
            <div className={styles.brandMark}>💊</div>
            <span className={styles.brandName}>MediOrder Pro</span>
          </div>

          {/* STEP INDICATORS */}
          <div className={styles.steps}>
            {steps.map((s, i) => (
              <div key={s.n} className={styles.stepItem}>
                <div className={`${styles.stepDot} ${step > s.n ? styles.done : step === s.n ? styles.active : ''}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                {i < steps.length - 1 && (
                  <div className={`${styles.stepLine} ${step > s.n ? styles.doneLine : ''}`} />
                )}
              </div>
            ))}
          </div>
          <div className={styles.stepBars}>
            {steps.map(s => (
              <div
                key={s.n}
                className={`${styles.stepBar} ${step > s.n ? styles.stepBarDone : step === s.n ? styles.stepBarActive : ''}`}
              />
            ))}
          </div>

          {/* ── STEP 1: BUSINESS PROFILE ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepLabel}>Step 1 of 3</div>
              <h1 className={styles.heading}>Set up your business profile</h1>
              <p className={styles.sub}>This creates your public distributor page that pharmacies will see when placing orders.</p>

              {error && <div className={styles.alertError}>{error}</div>}

              <div className={styles.formGrid}>
                <Input
                  label="Business Name *"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  placeholder="Shelf Pharma"
                />
                <Input
                  label="Contact Phone *"
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
                  label="Portal URL Slug *"
                  value={slug}
                  onChange={handleSlugInput}
                  placeholder="shelf-pharma"
                  hint={slug ? `Your pharmacy link: …/portal/${slug}` : 'Lowercase letters, numbers, hyphens only'}
                  mono
                />
              </div>
              <Input
                label="Business Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="PECHS Ext. Block 6, Karachi"
              />
              <div style={{ marginTop: 24 }}>
                <Button variant="accent" size="lg" loading={loading} onClick={saveProfile} style={{ width: '100%' }}>
                  Save Profile & Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: MEDICINE CATALOG ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepLabel}>Step 2 of 3</div>
              <h1 className={styles.heading}>Import your medicine catalog</h1>
              <p className={styles.sub}>Upload a CSV file to bulk-import your offer list. You can also skip this and add medicines manually from your dashboard.</p>

              <div className={styles.csvFormat}>
                <span className={styles.csvFormatLabel}>Required CSV columns:</span>
                {['name', 'tp'].map(c => <code key={c} className={styles.code}>{c}</code>)}
                <span className={styles.csvFormatLabel} style={{ marginLeft: 8 }}>Optional:</span>
                {['code', 'company', 'disc', 'bonus', 'stock'].map(c => <code key={c} className={styles.codeMuted}>{c}</code>)}
              </div>

              <div
                className={styles.dropZone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) {
                    const dt = new DataTransfer()
                    dt.items.add(f)
                    if (fileRef.current) fileRef.current.files = dt.files
                    handleCSV({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>)
                  }
                }}
              >
                <div className={styles.dropIcon}>📂</div>
                <div className={styles.dropTitle}>Click to choose CSV or drag & drop</div>
                <div className={styles.dropSub}>First row must be column headers</div>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
              </div>

              {csvPreview && (
                <div className={`${styles.csvPreview} ${csvRows.length > 0 ? styles.csvSuccess : styles.csvError}`}>
                  {csvPreview}
                </div>
              )}

              <div className={styles.stepActions}>
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button
                  variant="accent"
                  size="lg"
                  loading={importing}
                  onClick={importAndContinue}
                  style={{ flex: 1 }}
                >
                  {csvRows.length > 0 ? `Import ${csvRows.length} Medicines & Continue →` : 'Continue →'}
                </Button>
              </div>
              <div className={styles.skipLink}>
                <button onClick={finishOnboarding}>Skip for now — add medicines from dashboard</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.doneWrap}>
                <div className={styles.doneIcon}>🎉</div>
                <h1 className={styles.heading} style={{ textAlign: 'center' }}>You're all set!</h1>
                <p className={styles.sub} style={{ textAlign: 'center' }}>
                  Your MediOrder Pro account is ready. Share your pharmacy link to start receiving orders.
                </p>

                <div className={styles.shareBox}>
                  <input
                    className={styles.shareInput}
                    type="text"
                    value={shareLink}
                    readOnly
                  />
                  <button
                    className={styles.shareBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink)
                      toast('success', 'Link copied!')
                    }}
                  >
                    Copy
                  </button>
                </div>

                <div className={styles.doneFeatures}>
                  {[
                    { icon: '💊', title: 'Catalog', body: 'Add and manage your medicines' },
                    { icon: '🔗', title: 'Portal',  body: 'Pharmacies browse & order without a login' },
                    { icon: '📦', title: 'Orders',  body: 'Receive and confirm orders in real time' },
                  ].map(f => (
                    <div key={f.title} className={styles.doneFeature}>
                      <div className={styles.doneFeatureIcon}>{f.icon}</div>
                      <div className={styles.doneFeatureTitle}>{f.title}</div>
                      <div className={styles.doneFeatureBody}>{f.body}</div>
                    </div>
                  ))}
                </div>

                <Button variant="accent" size="lg" onClick={goToDashboard} style={{ width: '100%' }}>
                  Go to Dashboard →
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default function Onboarding(props: Props) {
  return <ToastProvider><OnboardingPage {...props} /></ToastProvider>
}

// If already onboarded, redirect to dashboard
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => ctx.req.cookies[n], set: () => {}, remove: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { redirect: { destination: '/login', permanent: false } }

  const { supabaseAdmin } = await import('@/lib/supabase/server')
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*').eq('id', session.user.id).single()

  if (profile?.onboarded) return { redirect: { destination: '/dashboard', permanent: false } }

  return { props: { profile: profile ?? { id: session.user.id }, email: session.user.email ?? '' } }
}
