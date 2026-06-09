import { useState, useMemo, useEffect } from 'react'
import Head from 'next/head'
import { fmtNum } from '@/lib/format'
import s from '@/styles/Portal.module.css'

interface Distributor { id:string; name:string; phone:string|null; whatsapp:string|null; address:string|null; city:string|null }
interface Medicine { id:string; code:string|null; name:string; company:string|null; mrp:number; tp:number; disc:number; net:number; bonus:string|null; stock:number }

export default function Portal() {
  const [dist,     setDist]     = useState<Distributor|null>(null)
  const [meds,     setMeds]     = useState<Medicine[]>([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [search,   setSearch]   = useState('')
  const [qty,      setQty]      = useState<Record<string, number>>({})
  const [pharmName,setPharmName]= useState('')

  useEffect(() => {
    const slug = window.location.pathname.split('/portal/')[1]
    if (!slug) { setNotFound(true); setLoading(false); return }
    fetch(`/api/portal/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setDist(d.distributor); setMeds(d.medicines) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const list = search
      ? meds.filter(m =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.code||'').toLowerCase().includes(search.toLowerCase()) ||
          (m.company||'').toLowerCase().includes(search.toLowerCase())
        )
      : meds
    return list.reduce<Record<string, Medicine[]>>((acc, m) => {
      const co = m.company || 'Other'
      if (!acc[co]) acc[co] = []
      acc[co].push(m)
      return acc
    }, {})
  }, [meds, search])

  const orderItems = useMemo(() =>
    meds.filter(m => (qty[m.id]||0) > 0).map(m => ({
      ...m, qty: qty[m.id],
      subtotal: m.net * qty[m.id]
    })),
    [meds, qty]
  )

  const totalBefore = orderItems.reduce((s, i) => s + i.tp * i.qty, 0)
  const totalAfter  = orderItems.reduce((s, i) => s + i.subtotal,   0)
  const saving      = totalBefore - totalAfter

  function clearOrder() { setQty({}) }

  async function downloadPDF() {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc  = new jsPDF('p', 'mm', 'a4') as any
    const date = new Date().toLocaleDateString('en-PK')

    // Header
    doc.setFillColor(8,12,18)
    doc.rect(0,0,210,38,'F')
    doc.setTextColor(0,229,160)
    doc.setFontSize(15); doc.setFont('helvetica','bold')
    doc.text('MediOrder Pro', 14, 14)
    doc.setTextColor(160,175,200); doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text(`Distributor: ${dist?.name || ''}`, 14, 22)
    if (dist?.phone) doc.text(`Phone: ${dist.phone}`, 14, 28)
    doc.text(`Pharmacy: ${pharmName || 'N/A'}   ·   Date: ${date}`, 110, 22)

    doc.autoTable({
      startY: 44,
      head: [['Code','Medicine','Qty','MRP','T.P','Disc%','Net Price','Subtotal']],
      body: orderItems.map(i => [
        i.code||'—', i.name, i.qty,
        `Rs.${fmtNum(i.mrp)}`,
        `Rs.${fmtNum(i.tp)}`,
        i.disc > 0 ? `${i.disc}%` : '—',
        `Rs.${fmtNum(i.net)}`,
        `Rs.${fmtNum(i.subtotal)}`,
      ]),
      foot: [
        ['','',`${orderItems.length} items`,'','','','Before Disc:',`Rs.${fmtNum(totalBefore)}`],
        ['','','','','','','Saving:',`Rs.${fmtNum(saving)}`],
        ['','','','','','','Total Payable:',`Rs.${fmtNum(totalAfter)}`],
      ],
      headStyles:{ fillColor:[8,12,18], textColor:[0,229,160], fontStyle:'bold', fontSize:9 },
      footStyles:{ fillColor:[13,18,30], fontStyle:'bold', textColor:[140,154,184] },
      styles:{ fontSize:9, cellPadding:3 },
      alternateRowStyles:{ fillColor:[13,18,30] },
    })

    // Footer
    const pages = (doc.internal as any).getNumberOfPages()
    for (let i=1;i<=pages;i++) {
      doc.setPage(i)
      doc.setFontSize(8); doc.setTextColor(80,90,110)
      doc.text(`MediOrder Pro · ${dist?.name||''} · Page ${i}/${pages}`, 14, doc.internal.pageSize.height - 8)
    }

    doc.save(`Order_${(pharmName||'Order').replace(/\s+/g,'_')}_${date}.pdf`)
  }

  function sendWhatsApp() {
    if (!dist?.whatsapp) { alert('No WhatsApp number configured for this distributor.'); return }
    const lines = [
      `*Order from: ${pharmName || 'Pharmacy'}*`,
      `*Distributor: ${dist.name}*`,
      `*Date: ${new Date().toLocaleDateString('en-PK')}*`,
      '',
      ...orderItems.map((i, n) =>
        `${n+1}. ${i.name}${i.code ? ` (${i.code})` : ''} — Qty: ${i.qty} × Rs.${fmtNum(i.net)} = Rs.${fmtNum(i.subtotal)}`
      ),
      '',
      `Before Discount: Rs.${fmtNum(totalBefore)}`,
      `Saving: Rs.${fmtNum(saving)}`,
      `*Total Payable: Rs.${fmtNum(totalAfter)}*`,
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${dist.whatsapp}?text=${text}`, '_blank')
  }

  if (loading) return (
    <div className={s.loadScreen}>
      <div className={s.loadMark}>💊</div>
      <div className={s.loadBar}><div className={s.loadFill} /></div>
    </div>
  )

  if (notFound) return (
    <div className={s.notFound}>
      <div style={{fontSize:48,marginBottom:16}}>🔍</div>
      <h1 style={{fontFamily:'var(--display)',marginBottom:8}}>Distributor not found</h1>
      <p style={{color:'var(--text3)',fontSize:14}}>This link may be incorrect or the distributor may not exist.</p>
    </div>
  )

  return (
    <>
      <Head><title>{dist?.name} — Order Portal</title></Head>
      <div className={s.portal}>

        {/* TOPBAR */}
        <header className={s.topbar}>
          <div className={s.topLeft}>
            <div className={s.topMark}>💊</div>
            <div>
              <h1 className={s.topName}>{dist?.name}</h1>
              <p className={s.topMeta}>
                {[dist?.phone&&`📞 ${dist.phone}`, dist?.city].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className={s.topRight}>
            <input
              className={s.pharmInput}
              type="text"
              placeholder="Your pharmacy name"
              value={pharmName}
              onChange={e => setPharmName(e.target.value)}
            />
          </div>
        </header>

        {/* SEARCH */}
        <div className={s.searchBar}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search medicine, code, company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className={s.searchClear} onClick={() => setSearch('')}>✕</button>}
          </div>
          {orderItems.length > 0 && (
            <div className={s.orderQuickSummary}>
              <span className={s.orderCount}>{orderItems.length} items</span>
              <span className={s.orderTotal}>Rs. {fmtNum(totalAfter)}</span>
            </div>
          )}
        </div>

        <div className={s.body}>
          {/* CATALOG */}
          <div className={s.catalog}>
            {Object.keys(grouped).length === 0 ? (
              <div className={s.empty}>
                <div>🔍</div>
                <div>No medicines match your search</div>
              </div>
            ) : Object.entries(grouped).map(([company, items]) => (
              <div key={company}>
                <div className={s.companyHeader}>{company}</div>
                <table className={s.medTable}>
                  <thead>
                    <tr>
                      <th>Code</th><th>Medicine</th><th>MRP (Rs.)</th>
                      <th>T.P (Rs.)</th><th>Disc%</th><th>Net (Rs.)</th><th>Bonus</th><th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => {
                      const net = m.net || m.tp * (1 - m.disc/100)
                      const hasQty = (qty[m.id]||0) > 0
                      return (
                        <tr key={m.id} className={hasQty ? s.rowActive : ''}>
                          <td><span className={s.code}>{m.code||'—'}</span></td>
                          <td className={s.medName}>{m.name}</td>
                          <td><span className="mono">{fmtNum(m.mrp)}</span></td>
                          <td><span className="mono">{fmtNum(m.tp)}</span></td>
                          <td>
                            {m.disc > 0
                              ? <span className={s.discBadge}>{m.disc}%</span>
                              : <span className={s.dash}>—</span>}
                          </td>
                          <td><span className={s.netPrice}>{fmtNum(net)}</span></td>
                          <td>
                            {m.bonus
                              ? <span className={s.bonusBadge}>{m.bonus}</span>
                              : <span className={s.dash}>—</span>}
                          </td>
                          <td>
                            <input
                              className={s.qtyInput}
                              type="number" min="0" max="9999" placeholder="0"
                              value={qty[m.id] || ''}
                              onChange={e => {
                                const v = parseInt(e.target.value) || 0
                                setQty(prev => {
                                  if (v <= 0) { const n = {...prev}; delete n[m.id]; return n }
                                  return { ...prev, [m.id]: v }
                                })
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

          {/* SIDEBAR */}
          <aside className={s.sidebar}>
            <div className={s.sidebarTitle}>Order Summary</div>

            {orderItems.length === 0 ? (
              <div className={s.sidebarEmpty}>Enter quantities to build your order</div>
            ) : (
              <div className={s.sidebarItems}>
                {orderItems.map(i => (
                  <div key={i.id} className={s.sidebarItem}>
                    <div className={s.sidebarItemName}>{i.name}</div>
                    <div className={s.sidebarItemMeta}>
                      ×{i.qty} = <span className={s.sidebarAmt}>Rs.{fmtNum(i.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={s.totals}>
              <div className={s.totalRow}>
                <span>Before Discount</span>
                <span className={`${s.totalOrange} mono`}>Rs.{fmtNum(totalBefore)}</span>
              </div>
              <div className={s.totalRow}>
                <span>You Save</span>
                <span className={`${s.totalGreen} mono`}>Rs.{fmtNum(saving)}</span>
              </div>
              <div className={`${s.totalRow} ${s.totalMain}`}>
                <span>Total Payable</span>
                <span className={`${s.totalGreen} mono`}>Rs.{fmtNum(totalAfter)}</span>
              </div>
            </div>

            <div className={s.sidebarActions}>
              <button
                className={s.btnPDF}
                onClick={downloadPDF}
                disabled={!orderItems.length}
              >
                ↓ Download PDF
              </button>
              {dist?.whatsapp && (
                <button
                  className={s.btnWA}
                  onClick={sendWhatsApp}
                  disabled={!orderItems.length}
                >
                  💬 Send on WhatsApp
                </button>
              )}
              <button
                className={s.btnClear}
                onClick={clearOrder}
                disabled={!orderItems.length}
              >
                Clear All
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
