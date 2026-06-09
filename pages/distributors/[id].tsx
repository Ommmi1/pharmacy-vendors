import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminShell from '@/components/layout/AdminShell'
import { fmtNum } from '@/lib/format'
import Papa from 'papaparse'
import s from '@/styles/Catalog.module.css'

interface Distributor { id:string; name:string; slug:string; phone:string|null; whatsapp:string|null; disabled:boolean }
interface Medicine { id:string; code:string|null; name:string; company:string|null; mrp:number; tp:number; disc:number; net:number; bonus:string|null; stock:number }

export default function DistributorCatalog() {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const [dist,     setDist]     = useState<Distributor|null>(null)
  const [meds,     setMeds]     = useState<Medicine[]>([])
  const [filtered, setFiltered] = useState<Medicine[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  // Add modal
  const [addOpen,  setAddOpen]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [addErr,   setAddErr]   = useState('')
  const [form, setForm] = useState({ code:'', name:'', company:'', mrp:'', tp:'', disc:'', bonus:'', stock:'999' })

  // Import
  const [importOpen, setImportOpen] = useState(false)
  const [csvRows,    setCsvRows]    = useState<any[]>([])
  const [csvPreview, setCsvPreview] = useState('')
  const [importing,  setImporting]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Delete
  const [delId,    setDelId]    = useState<string|null>(null)
  const [delName,  setDelName]  = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [dr, mr] = await Promise.all([
      fetch(`/api/distributors/${id}`, { credentials: 'same-origin' }),
      fetch(`/api/medicines?dist_id=${id}`)
    ])
    if (dr.ok) setDist(await dr.json())
    if (mr.ok) { const data = await mr.json(); setMeds(data); setFiltered(data) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!search) { setFiltered(meds); return }
    const q = search.toLowerCase()
    setFiltered(meds.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.code||'').toLowerCase().includes(q) ||
      (m.company||'').toLowerCase().includes(q)
    ))
  }, [search, meds])

  async function addMedicine() {
    setAddErr('')
    if (!form.name.trim()) { setAddErr('Name is required.'); return }
    const tp = parseFloat(form.tp)
    if (!tp || tp <= 0) { setAddErr('TP must be a positive number.'); return }
    setSaving(true)
    const r = await fetch('/api/medicines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dist_id: id, ...form, mrp: parseFloat(form.mrp)||0, tp, disc: parseFloat(form.disc)||0, stock: parseInt(form.stock)||999 }),
      credentials: 'same-origin'
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setAddErr(d.error); return }
    setAddOpen(false)
    setForm({ code:'', name:'', company:'', mrp:'', tp:'', disc:'', bonus:'', stock:'999' })
    load()
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    Papa.parse<any>(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.filter((r: any) => r.name && r.tp)
        setCsvRows(rows)
        setCsvPreview(rows.length === 0
          ? 'No valid rows found. Required: name, tp. Optional: code, company, mrp, disc, bonus, stock'
          : `✓ ${rows.length} medicines found. First: ${rows[0].name}`)
      }
    })
  }

  async function confirmImport() {
    if (!csvRows.length) return
    setImporting(true)
    const r = await fetch('/api/medicines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dist_id: id, medicines: csvRows }),
      credentials: 'same-origin'
    })
    const d = await r.json()
    setImporting(false)
    if (!r.ok) { setCsvPreview(`Error: ${d.error}`); return }
    setImportOpen(false); setCsvRows([]); setCsvPreview('')
    load()
  }

  async function deleteMed() {
    if (!delId) return
    setDeleting(true)
    await fetch(`/api/medicines/${delId}`, { method: 'DELETE', credentials: 'same-origin' })
    setDeleting(false); setDelId(null); load()
  }

  async function deleteAll() {
    if (!confirm(`Delete ALL ${meds.length} medicines for ${dist?.name}? Cannot be undone.`)) return
    // delete in batches via individual calls (or add a bulk endpoint later)
    for (const m of meds) {
      await fetch(`/api/medicines/${m.id}`, { method: 'DELETE', credentials: 'same-origin' })
    }
    load()
  }

  // Group by company
  const grouped = filtered.reduce<Record<string, Medicine[]>>((acc, m) => {
    const co = m.company || 'Other'
    if (!acc[co]) acc[co] = []
    acc[co].push(m)
    return acc
  }, {})

  const portalUrl = typeof window !== 'undefined' && dist ? `${window.location.origin}/portal/${dist.slug}` : ''

  return (
    <AdminShell title={dist ? `${dist.name} — Catalog` : 'Catalog'}>
      <div className={s.header}>
        <div>
          <div className={s.breadcrumb}>
            <Link href="/dashboard">← Distributors</Link>
          </div>
          <h1 className={s.title}>{dist?.name || 'Loading…'}</h1>
          <p className={s.sub}>{loading ? '…' : `${meds.length} medicines`}
            {dist?.slug && <> · <a href={portalUrl} target="_blank" rel="noreferrer" className={s.portalLink}>View Portal ↗</a></>}
          </p>
        </div>
        <div className={s.headerActions}>
          {meds.length > 0 && <button className={s.btnRed} onClick={deleteAll}>Delete All</button>}
          <button className={s.btnGhost} onClick={() => setImportOpen(true)}>📂 Import CSV</button>
          <button className={s.btnAccent} onClick={() => { setAddErr(''); setAddOpen(true) }}>+ Add Medicine</button>
        </div>
      </div>

      {/* Search */}
      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>🔍</span>
          <input className={s.searchInput} type="text" placeholder="Search name, code, company…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={s.searchClear} onClick={() => setSearch('')}>✕</button>}
        </div>
        {search && <span className={s.searchResult}>{filtered.length} results</span>}
      </div>

      {/* Table */}
      {loading ? (
        <div className={s.skeletonWrap}>{[1,2,3,4,5].map(i=><div key={i} className={`${s.skeletonRow} skeleton`}/>)}</div>
      ) : meds.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyIcon}>💊</div>
          <div className={s.emptyTitle}>No medicines yet</div>
          <p className={s.emptyBody}>Import a CSV or add medicines manually.</p>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button className={s.btnGhost} onClick={() => setImportOpen(true)}>📂 Import CSV</button>
            <button className={s.btnAccent} onClick={() => setAddOpen(true)}>+ Add Medicine</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyIcon}>🔍</div>
          <div className={s.emptyTitle}>No results for "{search}"</div>
          <button className={s.btnGhost} onClick={() => setSearch('')}>Clear</button>
        </div>
      ) : (
        <div className={s.tableCard}>
          {Object.entries(grouped).map(([company, items]) => (
            <div key={company}>
              <div className={s.companyHeader}>{company} <span className={s.companyCount}>{items.length}</span></div>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Code</th><th>Name</th><th>MRP</th><th>T.P</th>
                      <th>Disc%</th><th>Net</th><th>Bonus</th><th>Stock</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => (
                      <tr key={m.id}>
                        <td><span className={s.code}>{m.code||'—'}</span></td>
                        <td className={s.medName}>{m.name}</td>
                        <td><span className="mono">Rs.{fmtNum(m.mrp)}</span></td>
                        <td><span className="mono">Rs.{fmtNum(m.tp)}</span></td>
                        <td>{m.disc>0?<span className={s.discBadge}>{m.disc}%</span>:<span className={s.dash}>—</span>}</td>
                        <td><span className={s.net}>Rs.{fmtNum(m.net||m.tp*(1-m.disc/100))}</span></td>
                        <td>{m.bonus?<span className={s.bonusBadge}>{m.bonus}</span>:<span className={s.dash}>—</span>}</td>
                        <td><span className={m.stock<=10?s.lowStock:''}>{m.stock}</span></td>
                        <td>
                          <button className={s.btnRemove} onClick={() => { setDelId(m.id); setDelName(m.name) }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL */}
      {addOpen && (
        <div className={s.overlay} onMouseDown={e => e.target===e.currentTarget && setAddOpen(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Add Medicine</h2>
            {addErr && <div className={s.alertError}>{addErr}</div>}
            <div className={s.formGrid}>
              <div className={s.field}><label>Code</label><input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="028146" /></div>
              <div className={s.field}><label>Company</label><input value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="Abbott" /></div>
            </div>
            <div className={s.field} style={{marginBottom:12}}>
              <label>Medicine Name *</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="ABOCAL TAB" />
            </div>
            <div className={s.formGrid}>
              <div className={s.field}><label>MRP (Rs.)</label><input type="number" value={form.mrp} onChange={e=>setForm(f=>({...f,mrp:e.target.value}))} placeholder="350" /></div>
              <div className={s.field}><label>T.P (Rs.) *</label><input type="number" value={form.tp} onChange={e=>setForm(f=>({...f,tp:e.target.value}))} placeholder="298.35" /></div>
              <div className={s.field}><label>Discount %</label><input type="number" value={form.disc} onChange={e=>setForm(f=>({...f,disc:e.target.value}))} placeholder="5" /></div>
              <div className={s.field}><label>Bonus</label><input value={form.bonus} onChange={e=>setForm(f=>({...f,bonus:e.target.value}))} placeholder="5PCS 8%" /></div>
              <div className={s.field}><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} /></div>
            </div>
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => setAddOpen(false)}>Cancel</button>
              <button className={s.btnAccent} onClick={addMedicine} disabled={saving}>{saving?'Adding…':'Add Medicine'}</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {importOpen && (
        <div className={s.overlay} onMouseDown={e => e.target===e.currentTarget && setImportOpen(false)}>
          <div className={s.modal}>
            <h2 className={s.modalTitle}>Import CSV</h2>
            <p className={s.modalSub}>Required: <code>name</code>, <code>tp</code>. Optional: <code>code</code> <code>company</code> <code>mrp</code> <code>disc</code> <code>bonus</code> <code>stock</code>. First row = headers.</p>
            <div className={s.dropZone} onClick={() => fileRef.current?.click()}>
              <div>📂</div>
              <div>Click to choose CSV or drag & drop</div>
              <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleCSV} />
            </div>
            {csvPreview && (
              <div className={csvRows.length>0 ? s.csvSuccess : s.csvError}>{csvPreview}</div>
            )}
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => { setImportOpen(false); setCsvRows([]); setCsvPreview('') }}>Cancel</button>
              <button className={s.btnAccent} onClick={confirmImport} disabled={importing||!csvRows.length}>
                {importing ? 'Importing…' : csvRows.length > 0 ? `Import ${csvRows.length} Medicines` : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {delId && (
        <div className={s.overlay} onMouseDown={e => e.target===e.currentTarget && setDelId(null)}>
          <div className={s.modal} style={{maxWidth:380}}>
            <h2 className={s.modalTitle}>Remove Medicine</h2>
            <p className={s.modalSub}>Remove <strong>{delName}</strong>? Cannot be undone.</p>
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => setDelId(null)}>Cancel</button>
              <button className={s.btnDanger} onClick={deleteMed} disabled={deleting}>{deleting?'Removing…':'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
