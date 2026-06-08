import { useState, useMemo } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { fmtNum } from '@/lib/format'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Medicine } from '@/lib/supabase/types'
import styles from '@/styles/Portal.module.css'

interface Distributor {
  id: string; bizName: string | null; phone: string | null
  city: string | null; whatsapp: string | null
}
interface Props { distributor: Distributor; medicines: Medicine[] }

function PortalPage({ distributor, medicines }: Props) {
  const toast = useToast()
  const [qty,          setQty]          = useState<Record<string, number>>({})
  const [pharmacyName, setPharmacyName] = useState('')
  const [search,       setSearch]       = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)

  // Group medicines by company
  const grouped = useMemo(() => {
    const filtered = search
      ? medicines.filter(m =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.code || '').toLowerCase().includes(search.toLowerCase()) ||
          (m.company || '').toLowerCase().includes(search.toLowerCase())
        )
      : medicines

    return filtered.reduce<Record<string, Medicine[]>>((acc, m) => {
      const co = m.company || 'Other'
      if (!acc[co]) acc[co] = []
      acc[co].push(m)
      return acc
    }, {})
  }, [medicines, search])

  // Order summary
  const orderItems = useMemo(() =>
    medicines
      .filter(m => (qty[m.id] || 0) > 0)
      .map(m => {
        const q   = qty[m.id]
        const net = m.net || m.tp * (1 - m.disc / 100)
        return { ...m, qty: q, net, subtotal: net * q }
      }),
    [medicines, qty]
  )

  const totalBefore = orderItems.reduce((s, i) => s + i.tp  * i.qty, 0)
  const totalAfter  = orderItems.reduce((s, i) => s + i.subtotal,     0)
  const saving      = totalBefore - totalAfter

  async function submitOrder() {
    if (!orderItems.length) return
    setSubmitting(true)
    try {
      await api.post('/api/orders', {
        dist_id: distributor.id,
        pharmacy_name: pharmacyName || 'Anonymous',
        items: orderItems.map(i => ({ medicine_id: i.id, qty: i.qty })),
      })
      setSubmitted(true)
      setQty({})
      toast('success', `Order placed! ${orderItems.length} items · Rs. ${fmtNum(totalAfter)}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to place order.')
    } finally {
      setSubmitting(false)
    }
  }

  function generatePDF() {
    if (!orderItems.length) return
    import('jspdf').then(({ jsPDF }) => {
      // @ts-ignore
      import('jspdf-autotable')
      const doc = new jsPDF('p', 'mm', 'a4')
      const date = new Date().toLocaleDateString('en-PK')
      doc.setFillColor(8,12,18)
      doc.rect(0,0,210,36,'F')
      doc.setTextColor(0,229,160)
      doc.setFontSize(15); doc.setFont('helvetica','bold')
      doc.text('MediOrder Pro', 14, 13)
      doc.setTextColor(160,175,200); doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text(`Distributor: ${distributor.bizName || ''}`, 14, 21)
      doc.text(`Pharmacy: ${pharmacyName || 'N/A'}   ·   Date: ${date}`, 14, 28)
      ;(doc as any).autoTable({
        startY: 42,
        head: [['Code','Medicine','Qty','Disc%','T.P','Net','Subtotal']],
        body: orderItems.map(i => [
          i.code||'—', i.name, i.qty,
          i.disc > 0 ? `${i.disc}%` : '—',
          `Rs.${fmtNum(i.tp)}`, `Rs.${fmtNum(i.net)}`, `Rs.${fmtNum(i.subtotal)}`,
        ]),
        foot: [
          ['','',`${orderItems.length} items`,'','Before:',`Rs.${fmtNum(totalBefore)}`,''],
          ['','','','','Saving:',`Rs.${fmtNum(saving)}`,''],
          ['','','','','Total:',`Rs.${fmtNum(totalAfter)}`,''],
        ],
        headStyles: { fillColor:[8,12,18], textColor:[0,229,160], fontStyle:'bold', fontSize:9 },
        footStyles: { fillColor:[13,18,30], fontStyle:'bold', textColor:[140,154,184] },
        styles: { fontSize:9, cellPadding:3.5 },
        alternateRowStyles: { fillColor:[13,18,30] },
      })
      doc.save(`Order_${(pharmacyName||'Order').replace(/\s+/g,'_')}_${date}.pdf`)
    })
  }

  return (
    <>
      <Head><title>{distributor.bizName || 'Pharma'} — Order Portal</title></Head>
      <div className={styles.portal}>

        {/* TOPBAR */}
        <header className={styles.topbar}>
          <div className={styles.topbarBrand}>
            <div className={styles.topbarMark}>💊</div>
            <div>
              <h1 className={styles.topbarName}>{distributor.bizName}</h1>
              <p className={styles.topbarMeta}>
                {[distributor.phone && `📞 ${distributor.phone}`, distributor.city].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <input
              className={styles.pharmInput}
              type="text"
              placeholder="Your pharmacy name (optional)"
              value={pharmacyName}
              onChange={e => setPharmacyName(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={generatePDF} disabled={!orderItems.length}>
              ↓ PDF
            </Button>
          </div>
        </header>

        {/* SEARCH BAR */}
        <div className={styles.searchBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search medicine name, code, company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
          </div>
          {orderItems.length > 0 && (
            <div className={styles.searchStats}>
              <span className={styles.searchCount}>{orderItems.length} items</span>
              <span className={styles.searchTotal}>Rs. {fmtNum(totalAfter)}</span>
            </div>
          )}
        </div>

        <div className={styles.body}>
          {/* CATALOG */}
          <div className={styles.catalog}>
            {Object.entries(grouped).length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>
                <div>No medicines match your search</div>
              </div>
            ) : Object.entries(grouped).map(([company, meds]) => (
              <div key={company}>
                <div className={styles.companyHeader}>{company}</div>
                <table className={styles.medTable}>
                  <thead>
                    <tr>
                      <th>Code</th><th>Medicine</th><th>T.P</th>
                      <th>Disc%</th><th>Net (Rs.)</th><th>Bonus</th><th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map(m => {
                      const net = m.net || m.tp * (1 - m.disc / 100)
                      return (
                        <tr key={m.id} className={(qty[m.id] || 0) > 0 ? styles.rowActive : ''}>
                          <td><span className={`${styles.code} mono`}>{m.code || '—'}</span></td>
                          <td className={styles.medName}>{m.name}</td>
                          <td><span className="mono">{fmtNum(m.tp)}</span></td>
                          <td>{m.disc > 0 ? <Badge color="green">{m.disc}%</Badge> : <span className={styles.dash}>—</span>}</td>
                          <td><span className={`${styles.net} mono`}>{fmtNum(net)}</span></td>
                          <td>{m.bonus ? <Badge color="gold">{m.bonus}</Badge> : <span className={styles.dash}>—</span>}</td>
                          <td>
                            <input
                              className={styles.qtyInput}
                              type="number"
                              min="0"
                              max="9999"
                              placeholder="0"
                              value={qty[m.id] || ''}
                              onChange={e => {
                                const v = parseInt(e.target.value) || 0
                                setQty(prev => v > 0 ? { ...prev, [m.id]: v } : (() => { const n = { ...prev }; delete n[m.id]; return n })())
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* ORDER SUMMARY SIDEBAR */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Order Summary</div>

            {orderItems.length === 0 ? (
              <div className={styles.sidebarEmpty}>Enter quantities to build your order</div>
            ) : (
              <div className={styles.sidebarItems}>
                {orderItems.map(i => (
                  <div key={i.id} className={styles.sidebarItem}>
                    <div className={styles.sidebarItemName} title={i.name}>{i.name}</div>
                    <div className={styles.sidebarItemMeta}>
                      ×{i.qty} = <span className={styles.sidebarItemAmt}>Rs. {fmtNum(i.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.sidebarTotals}>
              <div className={styles.sidebarRow}>
                <span>Before Discount</span>
                <span className={`${styles.sidebarOrange} mono`}>Rs. {fmtNum(totalBefore)}</span>
              </div>
              <div className={styles.sidebarRow}>
                <span>You Save</span>
                <span className={`${styles.sidebarGreen} mono`}>Rs. {fmtNum(saving)}</span>
              </div>
              <div className={`${styles.sidebarRow} ${styles.sidebarTotal}`}>
                <span>Total Payable</span>
                <span className={`${styles.sidebarGreen} mono`}>Rs. {fmtNum(totalAfter)}</span>
              </div>
            </div>

            {submitted ? (
              <div className={styles.successBanner}>
                ✅ Order placed! The distributor will be in touch.
              </div>
            ) : (
              <Button
                variant="accent"
                size="lg"
                style={{ width: '100%', marginTop: '14px' }}
                disabled={!orderItems.length || submitting}
                loading={submitting}
                onClick={submitOrder}
              >
                Place Order
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              style={{ width: '100%', marginTop: '6px' }}
              onClick={() => setQty({})}
              disabled={!orderItems.length}
            >
              Clear All
            </Button>
          </aside>
        </div>
      </div>
    </>
  )
}

// Fetches distributor + medicines server-side — Supabase credentials never reach the browser
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string

  const { data: profile } = await (supabaseAdmin as any)
    .from('profiles')
    .select('id, biz_name, phone, city, address, whatsapp')
    .eq('slug', slug)
    .eq('onboarded', true)
    .single() as { data: any }

  if (!profile) return { notFound: true }

  const { data: medicines } = await (supabaseAdmin as any)
    .from('medicines')
    .select('id, code, name, company, tp, disc, net, bonus, stock')
    .eq('dist_id', profile.id)
    .order('company')
    .order('name')

  return {
    props: {
      distributor: {
        id:      profile.id,
        bizName: profile.biz_name,
        phone:   profile.phone,
        city:    profile.city,
        whatsapp:profile.whatsapp,
      },
      medicines: medicines || [],
    },
  }
}

export default function Portal(props: Props) {
  return <ToastProvider><PortalPage {...props} /></ToastProvider>
}
