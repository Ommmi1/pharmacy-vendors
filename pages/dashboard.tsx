import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'
import { fmtNum, fmtDate } from '@/lib/format'
import { withAuth } from '@/lib/withAuth'
import type { Profile, Order } from '@/lib/supabase/types'
import styles from '@/styles/Dashboard.module.css'

interface Props { profile: Profile; email: string }

export default function Dashboard({ profile, email }: Props) {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [medCount,setMedCount]= useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Order[]>('/api/orders'),
      api.get<unknown[]>('/api/medicines'),
    ]).then(([ords, meds]) => {
      setOrders(ords)
      setMedCount(meds.length)
    }).finally(() => setLoading(false))
  }, [])

  const total    = orders.length
  const pending  = orders.filter(o => o.status === 'pending').length
  const revenue  = orders.reduce((s, o) => s + (o.total_after || 0), 0)
  const recent   = orders.slice(0, 8)
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const statusColor: Record<string, 'orange' | 'blue' | 'green' | 'red'> = {
    pending: 'orange', confirmed: 'blue', completed: 'green', cancelled: 'red',
  }

  return (
    <AppShell profile={profile} email={email}>
      <Head><title>Dashboard — MediOrder Pro</title></Head>

      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{greeting}, {profile.biz_name}</h1>
          <p className={styles.sub}>Here's what's happening with your orders today.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" onClick={copyPortalLink}>🔗 Share Portal Link</Button>
          <Link href="/catalog"><Button variant="accent" size="sm">+ Add Medicines</Button></Link>
        </div>
      </div>

      {!profile.slug && (
        <div className={styles.setupBanner}>
          <span className={styles.setupIcon}>⚠️</span>
          <div>
            <strong>Complete your setup</strong> — Add a URL slug in{' '}
            <Link href="/settings">Settings</Link> to activate your pharmacy portal.
          </div>
        </div>
      )}

      {/* STATS */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Orders',  value: loading ? '—' : total,              color: 'green',  meta: `${pending} pending` },
          { label: 'Revenue (Rs.)', value: loading ? '—' : fmtNum(revenue),    color: 'blue',   meta: 'All time' },
          { label: 'Medicines',     value: loading || medCount === null ? '—' : medCount, color: 'orange', meta: 'In catalog' },
          { label: 'Pending',       value: loading ? '—' : pending,            color: 'purple', meta: 'Awaiting confirmation' },
        ].map(s => (
          <div key={s.label} className={`${styles.statCard} ${styles[s.color]}`}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statMeta}>{s.meta}</div>
          </div>
        ))}
      </div>

      {/* RECENT ORDERS */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Recent Orders</h2>
          <Link href="/orders"><Button variant="subtle" size="sm">View All</Button></Link>
        </div>

        {loading ? (
          <div className={styles.skeletonRows}>
            {[1,2,3].map(i => <div key={i} className={`${styles.skeletonRow} skeleton`} />)}
          </div>
        ) : recent.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <div className={styles.emptyTitle}>No orders yet</div>
            <p className={styles.emptyText}>Share your pharmacy portal link to start receiving orders.</p>
            <Button variant="outline" onClick={copyPortalLink}>🔗 Copy Portal Link</Button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order #</th><th>Pharmacy</th><th>Items</th>
                  <th>Total (Rs.)</th><th>Status</th><th>Date</th><th />
                </tr>
              </thead>
              <tbody>
                {recent.map(o => (
                  <tr key={o.id}>
                    <td><span className={`${styles.orderId} mono`}>#{o.id.slice(0,8)}</span></td>
                    <td className={styles.strong}>{o.pharmacy_name || '—'}</td>
                    <td><span className="mono">{o.item_count}</span></td>
                    <td><span className={`${styles.revenue} mono`}>Rs. {fmtNum(o.total_after)}</span></td>
                    <td><Badge color={statusColor[o.status] || 'muted'}>{o.status}</Badge></td>
                    <td className={styles.date}>{fmtDate(o.created_at)}</td>
                    <td><Link href={`/orders?id=${o.id}`}><Button variant="subtle" size="sm">View</Button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )

  function copyPortalLink() {
    if (!profile.slug) { alert('Set a URL slug in Settings first.'); return }
    const link = `${window.location.origin}/portal/${profile.slug}`
    navigator.clipboard.writeText(link)
  }
}

export const getServerSideProps = withAuth()
