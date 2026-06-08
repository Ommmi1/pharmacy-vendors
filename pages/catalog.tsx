import { useEffect, useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtNum } from '@/lib/format'
import { withAuth } from '@/lib/withAuth'
import type { Profile, Medicine } from '@/lib/supabase/types'
import styles from '@/styles/Catalog.module.css'
import Papa from 'papaparse'

interface Props { profile: Profile; email: string }

function CatalogPage({ profile, email }: Props) {
  const toast    = useToast()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [medicines,  setMedicines]  = useState<Medicine[]>([])
  const [filtered,   setFiltered]   = useState<Medicine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  // Add medicine modal
  const [addOpen,    setAddOpen]    = useState(false)
  const [medCode,    setMedCode]    = useState('')
  const [medName,    setMedName]    = useState('')
  const [medCompany, setMedCompany] = useState('')
  const [medTp,      setMedTp]      = useState('')
  const [medDisc,    setMedDisc]    = useState('')
  const [medBonus,   setMedBonus]   = useState('')
  const [medStock,   setMedStock]   = useState('999')
  const [addError,   setAddError]   = useState('')

  // Import modal
  const [importOpen,    setImportOpen]    = useState(false)
  const [importRows,    setImportRows]    = useState<Record<string,string>[]>([])
  const [importPreview, setImportPreview] = useState('')
  const [importing,     setImporting]     = useState(false)

  // Delete confirm modal
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleteNm,   setDeleteNm]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Medicine[]>('/api/medicines')
      setMedicines(data)
      setFiltered(data)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to load catalog.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!search) { setFiltered(medicines); return }
    const q = search.toLowerCase()
    setFiltered(medicines.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.code || '').toLowerCase().includes(q) ||
      (m.company || '').toLowerCase().includes(q)
    ))
  }, [search, medicines])

  function resetAddForm() {
    setMedCode(''); setMedName(''); setMedCompany('')
    setMedTp(''); setMedDisc(''); setMedBonus(''); setMedStock('999')
    setAddError('')
  }

  async function saveMedicine() {
    setAddError('')
    if (!medName.trim()) { setAddError('Medicine name is required.'); return }
    const tp = parseFloat(medTp)
    if (!tp || tp <= 0)  { setAddError('Trade price must be a positive number.'); return }
    setSaving(true)
    try {
      await api.post<Medicine>('/api/medicines', {
        code: medCode.trim(), name: medName.trim(),
        company: medCompany.trim(), tp, disc: parseFloat(medDisc) || 0,
        bonus: medBonus.trim(), stock: parseInt(medStock) || 999,
      })
      toast('success', `"${medName.trim()}" added to catalog.`)
      setAddOpen(false)
      resetAddForm()
      load()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add medicine.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(deleteId)
    try {
      await api.delete(`/api/medicines/${deleteId}`)
      toast('success', `"${deleteNm}" removed.`)
      setDeleteId(null)
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setDeleting(null)
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
        setImportRows(rows)
        setImportPreview(
          rows.length === 0
            ? 'No valid rows found. Ensure columns: name, tp (and optionally: code, company, disc, bonus, stock)'
            : `✓ ${rows.length} medicines found. First: ${rows[0].name}`
        )
      },
      error: () => setImportPreview('Failed to read CSV.'),
    })
  }

  async function confirmImport() {
    if (!importRows.length) return
    setImporting(true)
    try {
      const { inserted } = await api.post<{ inserted: number }>('/api/medicines/import', {
        medicines: importRows.map(r => ({
          code:    r.code    || '', name: r.name,
          company: r.company || '', tp: parseFloat(r.tp)   || 0,
          disc:    parseFloat(r.disc) || 0,
          bonus:   r.bonus   || '', stock: parseInt(r.stock) || 999,
        })),
      })
      toast('success', `${inserted} medicines imported.`)
      setImportOpen(false)
      setImportRows([])
      setImportPreview('')
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  function exportCSV() {
    const header = 'code,name,company,tp,disc,bonus,stock'
    const rows = medicines.map(m =>
      [m.code, m.name, m.company, m.tp, m.disc, m.bonus, m.stock]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download = `catalog_${profile.biz_name || 'export'}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  // Group by company for display
  const grouped = filtered.reduce<Record<string, Medicine[]>>((acc, m) => {
    const co = m.company || 'Other'
    if (!acc[co]) acc[co] = []
    acc[co].push(m)
    return acc
  }, {})

  return (
    <AppShell profile={profile} email={email}>
      <Head><title>Catalog — MediOrder Pro</title></Head>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Medicine Catalog</h1>
          <p className={styles.sub}>
            {loading ? 'Loading…' : `${medicines.length} medicines across ${Object.keys(grouped).length || 0} companies`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={medicines.length === 0}>
            ↓ Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            📂 Import CSV
          </Button>
          <Button variant="accent" size="sm" onClick={() => { resetAddForm(); setAddOpen(true) }}>
            + Add Medicine
          </Button>
        </div>
      </div>

      {/* SEARCH */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name, code, or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
        </div>
        {search && (
          <span className={styles.searchResult}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <div className={styles.skeletonWrap}>
          {[1,2,3,4,5].map(i => <div key={i} className={`${styles.skeletonRow} skeleton`} />)}
        </div>
      ) : medicines.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💊</div>
          <div className={styles.emptyTitle}>No medicines yet</div>
          <p className={styles.emptyBody}>Import a CSV to bulk-add your offer list, or add medicines one by one.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => setImportOpen(true)}>📂 Import CSV</Button>
            <Button variant="accent" onClick={() => { resetAddForm(); setAddOpen(true) }}>+ Add Medicine</Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyTitle}>No results</div>
          <p className={styles.emptyBody}>No medicines match "{search}"</p>
          <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          {Object.entries(grouped).map(([company, meds]) => (
            <div key={company}>
              <div className={styles.companyHeader}>
                {company}
                <span className={styles.companyCount}>{meds.length}</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Medicine Name</th>
                      <th>T.P (Rs.)</th>
                      <th>Disc %</th>
                      <th>Net Price</th>
                      <th>Bonus</th>
                      <th>Stock</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map(m => (
                      <tr key={m.id}>
                        <td><span className={`${styles.code} mono`}>{m.code || '—'}</span></td>
                        <td className={styles.medName}>{m.name}</td>
                        <td><span className="mono">Rs. {fmtNum(m.tp)}</span></td>
                        <td>
                          {m.disc > 0
                            ? <Badge color="green">{m.disc}%</Badge>
                            : <span className={styles.dash}>—</span>}
                        </td>
                        <td>
                          <span className={`${styles.net} mono`}>
                            Rs. {fmtNum(m.net || m.tp * (1 - m.disc / 100))}
                          </span>
                        </td>
                        <td>
                          {m.bonus
                            ? <Badge color="gold">{m.bonus}</Badge>
                            : <span className={styles.dash}>—</span>}
                        </td>
                        <td>
                          <Badge color={m.stock <= 10 ? 'red' : 'muted'}>
                            {m.stock}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="red"
                            size="sm"
                            loading={deleting === m.id}
                            onClick={() => { setDeleteId(m.id); setDeleteNm(m.name) }}
                          >
                            Remove
                          </Button>
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

      {/* ── ADD MEDICINE MODAL ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Medicine"
        subtitle="Add a single medicine to your catalog."
        accentTop
      >
        {addError && <div className={styles.formError}>{addError}</div>}
        <div className={styles.formGrid}>
          <Input label="Item Code" value={medCode} onChange={e => setMedCode(e.target.value)} placeholder="028146" mono />
          <Input label="Company / Manufacturer" value={medCompany} onChange={e => setMedCompany(e.target.value)} placeholder="Abbott Laboratories" />
        </div>
        <Input label="Medicine Name *" value={medName} onChange={e => setMedName(e.target.value)} placeholder="ABOCAL TAB" style={{ marginBottom: 14 }} />
        <div className={styles.formGrid}>
          <Input label="Trade Price (Rs.) *" type="number" value={medTp} onChange={e => setMedTp(e.target.value)} placeholder="298.35" />
          <Input label="Discount %" type="number" value={medDisc} onChange={e => setMedDisc(e.target.value)} placeholder="5" min="0" max="100" />
          <Input label="Bonus / Offer" value={medBonus} onChange={e => setMedBonus(e.target.value)} placeholder="5PCS 8%" />
          <Input label="Initial Stock" type="number" value={medStock} onChange={e => setMedStock(e.target.value)} placeholder="999" />
        </div>
        <div className={styles.modalActions}>
          <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="accent" loading={saving} onClick={saveMedicine}>Add Medicine</Button>
        </div>
      </Modal>

      {/* ── IMPORT CSV MODAL ── */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import CSV"
        subtitle={undefined}
        accentTop
      >
        <div className={styles.csvInfo}>
          Required columns: <code className={styles.inlineCode}>name</code>, <code className={styles.inlineCode}>tp</code>
          &nbsp;— Optional: <code className={styles.inlineCodeMuted}>code</code> <code className={styles.inlineCodeMuted}>company</code> <code className={styles.inlineCodeMuted}>disc</code> <code className={styles.inlineCodeMuted}>bonus</code> <code className={styles.inlineCodeMuted}>stock</code>
        </div>
        <div
          className={styles.dropZone}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (!f) return
            const dt = new DataTransfer(); dt.items.add(f)
            if (fileRef.current) { fileRef.current.files = dt.files }
            handleCSV({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>)
          }}
        >
          <div className={styles.dropIcon}>📂</div>
          <div className={styles.dropTitle}>Click to choose CSV or drag & drop</div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
        </div>
        {importPreview && (
          <div className={`${styles.csvPreview} ${importRows.length > 0 ? styles.csvSuccess : styles.csvError}`}>
            {importPreview}
          </div>
        )}
        <div className={styles.modalActions}>
          <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button
            variant="accent"
            loading={importing}
            disabled={importRows.length === 0}
            onClick={confirmImport}
          >
            Import {importRows.length > 0 ? `${importRows.length} Medicines` : ''}
          </Button>
        </div>
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remove Medicine"
        subtitle={`Remove "${deleteNm}" from your catalog? This cannot be undone.`}
      >
        <div className={styles.modalActions}>
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="red" loading={!!deleting} onClick={confirmDelete}>Remove</Button>
        </div>
      </Modal>
    </AppShell>
  )
}

export default function Catalog(props: Props) {
  return <ToastProvider><CatalogPage {...props} /></ToastProvider>
}

export const getServerSideProps = withAuth()
