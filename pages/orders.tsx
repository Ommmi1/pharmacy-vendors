import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { fmtNum, fmtDate } from '@/lib/format'
import { withAuth } from '@/lib/withAuth'
import type { Profile, Order, OrderItem } from '@/lib/supabase/types'
import styles from '@/styles/Orders.module.css'

interface Props { profile: Profile; email: string }

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
type OrderWithItems = Order & { items: OrderItem[] }

const STATUS_COLOR: Record<string, 'orange' | 'blue' | 'green' | 'red' | 'muted'> = {
  pending:   'orange',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red',
}

function OrdersPage({ profile, email }: Props) {
  const router = useRouter()
  const toast  = useToast()

  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<StatusFilter>('all')

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<OrderWithItems | null>(null)
  const [detailOpen,  setDetailOpen]  = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updating,    setUpdating]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Order[]>('/api/orders')
      setOrders(data)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { load() }, [load])

  // Auto-open order detail from query param (e.g. linked from dashboard)
  useEffect(() => {
    const id = router.query.id as string
    if (id && orders.length > 0) {
      openDetail(id)
      router.replace('/orders', undefined, { shallow: true })
    }
  }, [router.query.id, orders]) // eslint-disable-line

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  async function openDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const data = await api.get<OrderWithItems>(`/api/orders/${id}`)
      setDetailOrder(data)
    } catch (err) {
      toast('error', 'Failed to load order details.')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function updateStatus(status: string) {
    if (!detailOrder) return
    setUpdating(true)
    try {
      await api.patch(`/api/orders/${detailOrder.id}`, { status })
      toast('success', `Order marked as ${status}.`)
      setDetailOpen(false)
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setUpdating(false)
    }
  }

  async function generatePDF() {
    if (!detailOrder) return
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc  = new jsPDF('p', 'mm', 'a4')
    const date = fmtDate(detailOrder.created_at)
    const items = detailOrder.items

    doc.setFillColor(8, 12, 18)
    doc.rect(0, 0, 210, 36, 'F')
    doc.setTextColor(0, 229, 160)
    doc.setFontSize(15); doc.setFont(undefined as unknown as string, 'bold')
    doc.text('MediOrder Pro', 14, 13)
    doc.setTextColor(160, 175, 200); doc.setFontSize(9); doc.setFont(undefined as unknown as string, 'normal')
    doc.text(`Distributor: ${profile.biz_name || '—'}`, 14, 21)
    doc.text(`Pharmacy: ${detailOrder.pharmacy_name || '—'}   ·   Date: ${date}`, 14, 28)

    const before = items.reduce((s, i) => s + i.tp * i.qty, 0)
    const after  = items.reduce((s, i) => s + i.subtotal, 0)

    ;(doc as unknown as { autoTable: Function }).autoTable({ // eslint-disable-line
      startY: 42,
      head: [['Code', 'Medicine', 'Qty', 'Disc%', 'T.P', 'Net', 'Subtotal']],
      body: items.map(i => [
        i.code || '—', i.name, i.qty,
        i.disc > 0 ? `${i.disc}%` : '—',
        `Rs.${fmtNum(i.tp)}`, `Rs.${fmtNum(i.net)}`, `Rs.${fmtNum(i.subtotal)}`,
      ]),
      foot: [
        ['', '', `${items.length} items`, '', 'Before Discount:', `Rs.${fmtNum(before)}`, ''],
        ['', '', '', '', 'Saving:', `Rs.${fmtNum(before - after)}`, ''],
        ['', '', '', '', 'Total Payable:', `Rs.${fmtNum(after)}`, ''],
      ],
      headStyles: { fillColor: [8,12,18], textColor: [0,229,160], fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [13,18,30], fontStyle: 'bold', textColor: [140,154,184] },
      styles: { fontSize: 9, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [13,18,30] },
    })

    const pages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFontSize(8); doc.setTextColor(80, 90, 110)
      doc.text(
        `© ${new Date().getFullYear()} MediOrder Pro · ${profile.biz_name || ''} · Page ${i}/${pages}`,
        14, doc.internal.pageSize.height - 8
      )
    }

    doc.save(`Order_${(detailOrder.pharmacy_name || 'Order').replace(/\s+/g, '_')}_${date}.pdf`)
    toast('success', 'PDF downloaded.')
  }

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <AppShell profile={profile} email={email}>
      <Head><title>Orders — MediOrder Pro</title></Head>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.sub}>All orders placed through your pharmacy portal</p>
        </div>
      </div>

      {/* STATUS TABS */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`${styles.tabCount} ${filter === t.key ? styles.tabCountActive : ''}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={styles.card}>
        {loading ? (
          <div className={styles.skeletonWrap}>
            {[1,2,3,4].map(i => <div key={i} className={`${styles.skeletonRow} skeleton`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <div className={styles.emptyTitle}>
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </div>
            <p className={styles.emptyBody}>
              {filter === 'all'
                ? 'Share your pharmacy portal link to start receiving orders.'
                : `Orders will appear here once their status is "${filter}".`}
            </p>
            {filter === 'all' && (
              <Button variant="outline" onClick={() => {
                if (!profile.slug) return
                navigator.clipboard.writeText(`${window.location.origin}/portal/${profile.slug}`)
                toast('success', 'Link copied!')
              }}>
                🔗 Copy Portal Link
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Pharmacy</th>
                  <th>Items</th>
                  <th>Before Disc.</th>
                  <th>Total (Rs.)</th>
                  <th>Saving (Rs.)</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} onClick={() => openDetail(o.id)} className={styles.clickableRow}>
                    <td><span className={`${styles.orderId} mono`}>#{o.id.slice(0, 8)}</span></td>
                    <td className={styles.pharmacy}>{o.pharmacy_name || '—'}</td>
                    <td><span className="mono">{o.item_count}</span></td>
                    <td><span className={`${styles.before} mono`}>Rs. {fmtNum(o.total_before)}</span></td>
                    <td><span className={`${styles.total} mono`}>Rs. {fmtNum(o.total_after)}</span></td>
                    <td><span className={`${styles.saving} mono`}>Rs. {fmtNum(o.total_before - o.total_after)}</span></td>
                    <td><Badge color={STATUS_COLOR[o.status] || 'muted'}>{o.status}</Badge></td>
                    <td className={styles.date}>{fmtDate(o.created_at)}</td>
                    <td><Button variant="subtle" size="sm" onClick={e => { e.stopPropagation(); openDetail(o.id) }}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ORDER DETAIL MODAL ── */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="680px"
        accentTop
      >
        {detailLoading ? (
          <div className={styles.detailSkeleton}>
            {[1,2,3].map(i => <div key={i} className={`skeleton ${styles.detailSkeletonRow}`} />)}
          </div>
        ) : detailOrder ? (
          <>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>Order #{detailOrder.id.slice(0, 8)}</h2>
                <div className={styles.detailMeta}>
                  <span className={styles.detailPharmacy}>{detailOrder.pharmacy_name || 'Unknown Pharmacy'}</span>
                  <span className={styles.detailDot}>·</span>
                  <span className={styles.detailDate}>{fmtDate(detailOrder.created_at)}</span>
                  <span className={styles.detailDot}>·</span>
                  <Badge color={STATUS_COLOR[detailOrder.status] || 'muted'}>{detailOrder.status}</Badge>
                </div>
              </div>
              <Button variant="subtle" size="sm" onClick={generatePDF}>↓ PDF</Button>
            </div>

            <div className={styles.detailTableWrap}>
              <table className={styles.detailTable}>
                <thead>
                  <tr>
                    <th>#</th><th>Medicine</th><th>T.P</th><th>Disc</th>
                    <th>Net</th><th>Qty</th><th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((item, i) => (
                    <tr key={item.id}>
                      <td className={styles.detailNum}>{i + 1}</td>
                      <td>
                        <div className={styles.detailMedName}>{item.name}</div>
                        {item.code && <div className={styles.detailMedCode}>{item.code}</div>}
                      </td>
                      <td><span className="mono">Rs. {fmtNum(item.tp)}</span></td>
                      <td>
                        {item.disc > 0
                          ? <Badge color="green">{item.disc}%</Badge>
                          : <span className={styles.dash}>—</span>}
                      </td>
                      <td><span className={`${styles.detailNet} mono`}>Rs. {fmtNum(item.net)}</span></td>
                      <td><span className="mono">{item.qty}</span></td>
                      <td><span className={`${styles.detailSubtotal} mono`}>Rs. {fmtNum(item.subtotal)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div className={styles.detailTotals}>
              <div className={styles.detailTotalRow}>
                <span className={styles.detailTotalLabel}>Before Discount</span>
                <span className={`${styles.detailTotalBefore} mono`}>Rs. {fmtNum(detailOrder.total_before)}</span>
              </div>
              <div className={styles.detailTotalRow}>
                <span className={styles.detailTotalLabel}>Saving</span>
                <span className={`${styles.detailTotalGreen} mono`}>
                  Rs. {fmtNum(detailOrder.total_before - detailOrder.total_after)}
                </span>
              </div>
              <div className={`${styles.detailTotalRow} ${styles.detailTotalMain}`}>
                <span>Total Payable</span>
                <span className={`${styles.detailTotalGreen} mono`}>Rs. {fmtNum(detailOrder.total_after)}</span>
              </div>
            </div>

            {/* STATUS ACTIONS */}
            <div className={styles.detailActions}>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {detailOrder.status === 'pending' && (
                <Button variant="subtle" loading={updating} onClick={() => updateStatus('confirmed')}>
                  ✓ Confirm Order
                </Button>
              )}
              {detailOrder.status === 'confirmed' && (
                <Button variant="accent" loading={updating} onClick={() => updateStatus('completed')}>
                  ✅ Mark Completed
                </Button>
              )}
              {(detailOrder.status === 'pending' || detailOrder.status === 'confirmed') && (
                <Button variant="red" loading={updating} onClick={() => updateStatus('cancelled')}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        ) : null}
      </Modal>
    </AppShell>
  )
}

export default function Orders(props: Props) {
  return <ToastProvider><OrdersPage {...props} /></ToastProvider>
}

export const getServerSideProps = withAuth()
