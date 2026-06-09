import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import AdminShell from '@/components/layout/AdminShell'
import { fmtNum } from '@/lib/format'
import s from '@/styles/Dashboard.module.css'

interface Distributor {
  id: string; name: string; slug: string; phone: string | null
  whatsapp: string | null; city: string | null; disabled: boolean; created_at: string
}

export default function Dashboard() {
  const [dists,   setDists]   = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Create modal state
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({ name:'', slug:'', phone:'', whatsapp:'', city:'', address:'' })
  const [formErr, setFormErr] = useState('')

  // Delete confirm
  const [delId,   setDelId]   = useState<string|null>(null)
  const [delName, setDelName] = useState('')
  const [deleting,setDeleting]= useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/distributors')
    const d = await r.json()
    if (r.ok) setDists(d)
    else setError(d.error)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function handleSlug(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-') }))
  }

  async function createDist() {
    setFormErr('')
    if (!form.name.trim() || !form.slug.trim()) { setFormErr('Name and slug are required.'); return }
    setSaving(true)
    const r = await fetch('/api/distributors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form), credentials: 'same-origin'
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setFormErr(d.error); return }
    setModal(false)
    setForm({ name:'', slug:'', phone:'', whatsapp:'', city:'', address:'' })
    load()
  }

  async function deleteDist() {
    if (!delId) return
    setDeleting(true)
    await fetch(`/api/distributors/${delId}`, { method: 'DELETE', credentials: 'same-origin' })
    setDeleting(false)
    setDelId(null)
    load()
  }

  const portalBase = typeof window !== 'undefined' ? `${window.location.origin}/portal/` : '/portal/'

  return (
    <AdminShell title="Distributors">
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Distributors</h1>
          <p className={s.sub}>{dists.length} distributor{dists.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className={s.btnAccent} onClick={() => setModal(true)}>+ New Distributor</button>
      </div>

      {error && <div className={s.alertError}>{error}</div>}

      {loading ? (
        <div className={s.grid}>
          {[1,2,3].map(i => <div key={i} className={`${s.card} skeleton`} style={{height:160}} />)}
        </div>
      ) : dists.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyIcon}>🏪</div>
          <div className={s.emptyTitle}>No distributors yet</div>
          <p className={s.emptyText}>Create your first distributor to get started.</p>
          <button className={s.btnAccent} onClick={() => setModal(true)}>+ New Distributor</button>
        </div>
      ) : (
        <div className={s.grid}>
          {dists.map(d => (
            <div key={d.id} className={`${s.card} ${d.disabled ? s.cardDisabled : ''}`}>
              <div className={s.cardTop}>
                <div className={s.cardAvatar}>{d.name[0].toUpperCase()}</div>
                <div className={s.cardInfo}>
                  <div className={s.cardName}>{d.name}</div>
                  <div className={s.cardSlug}>/{d.slug}</div>
                </div>
                <span className={`${s.badge} ${d.disabled ? s.badgeRed : s.badgeGreen}`}>
                  {d.disabled ? 'Disabled' : 'Active'}
                </span>
              </div>
              {(d.phone || d.city) && (
                <div className={s.cardMeta}>
                  {d.phone && <span>📞 {d.phone}</span>}
                  {d.city  && <span>📍 {d.city}</span>}
                </div>
              )}
              <div className={s.cardLink}>
                <span className={s.linkText}>{portalBase}{d.slug}</span>
                <button className={s.copyBtn} onClick={() => navigator.clipboard.writeText(`${portalBase}${d.slug}`)}>
                  Copy
                </button>
              </div>
              <div className={s.cardActions}>
                <Link href={`/distributors/${d.id}`} className={s.btnManage}>
                  Manage Catalog →
                </Link>
                <button className={s.btnDel} onClick={() => { setDelId(d.id); setDelName(d.name) }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {modal && (
        <div className={s.overlay} onMouseDown={e => e.target === e.currentTarget && setModal(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>New Distributor</h2>
            <p className={s.modalSub}>Create a distributor account. They get a public portal pharmacies can visit.</p>
            {formErr && <div className={s.alertError}>{formErr}</div>}
            <div className={s.formGrid}>
              <div className={s.field}>
                <label>Business Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Shelf Pharma" />
              </div>
              <div className={s.field}>
                <label>URL Slug *</label>
                <input value={form.slug} onChange={handleSlug} placeholder="shelf-pharma" className={s.mono} />
              </div>
              <div className={s.field}>
                <label>Phone</label>
                <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="03007774353" />
              </div>
              <div className={s.field}>
                <label>WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="923007774353" />
              </div>
              <div className={s.field}>
                <label>City</label>
                <input value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} placeholder="Karachi" />
              </div>
              <div className={s.field}>
                <label>Address</label>
                <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="PECHS Block 6" />
              </div>
            </div>
            {form.slug && (
              <div className={s.slugPreview}>
                Portal URL: <strong>{portalBase}{form.slug}</strong>
              </div>
            )}
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => setModal(false)}>Cancel</button>
              <button className={s.btnAccent} onClick={createDist} disabled={saving}>
                {saving ? 'Creating…' : 'Create Distributor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {delId && (
        <div className={s.overlay} onMouseDown={e => e.target === e.currentTarget && setDelId(null)}>
          <div className={s.modal} style={{maxWidth:400}}>
            <h2 className={s.modalTitle}>Delete Distributor</h2>
            <p className={s.modalSub}>Delete <strong>{delName}</strong>? This will also delete all their medicines. This cannot be undone.</p>
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => setDelId(null)}>Cancel</button>
              <button className={s.btnDanger} onClick={deleteDist} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
