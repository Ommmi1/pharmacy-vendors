import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — requires auth (distributor reading their orders)
  if (req.method === 'GET') {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('dist_id', user.id)
        .order('created_at', { ascending: false })

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (err) {
      return handleError(res, err)
    }
  }

  // POST — public (pharmacy placing an order, no auth required)
  if (req.method === 'POST') {
    const { dist_id, pharmacy_name, items } = req.body

    if (!dist_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'dist_id and items are required.' })
    }
    if (items.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 items per order.' })
    }

    // Verify the distributor exists and is onboarded
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, onboarded')
      .eq('id', dist_id)
      .single()

    if (!profile || !profile.onboarded) {
      return res.status(404).json({ error: 'Distributor not found.' })
    }

    // Verify all medicine IDs belong to this distributor (prevents order injection)
    const medIds = items.map((i: { medicine_id: string }) => i.medicine_id).filter(Boolean)
    if (medIds.length > 0) {
      const { data: meds } = await supabaseAdmin
        .from('medicines')
        .select('id, dist_id, name, code, tp, disc, net')
        .in('id', medIds)

      const validIds = new Set((meds || []).filter(m => m.dist_id === dist_id).map(m => m.id))
      const invalid = medIds.filter((id: string) => !validIds.has(id))
      if (invalid.length > 0) {
        return res.status(400).json({ error: 'Invalid medicine IDs in order.' })
      }

      // Use server-side prices — never trust client-sent prices
      const medMap = new Map((meds || []).map(m => [m.id, m]))
      let total_before = 0
      let total_after  = 0

      const validatedItems = items.map((item: {
        medicine_id: string
        qty: number
      }) => {
        const med = medMap.get(item.medicine_id)
        if (!med) throw new Error(`Medicine ${item.medicine_id} not found`)
        const qty    = Math.max(1, Math.floor(Number(item.qty) || 1))
        const net    = Number(med.net) || Number(med.tp) * (1 - Number(med.disc) / 100)
        const tp     = Number(med.tp)
        total_before += tp  * qty
        total_after  += net * qty
        return {
          medicine_id: item.medicine_id,
          name:    med.name,
          code:    med.code,
          tp,
          disc:    Number(med.disc),
          net,
          qty,
          subtotal: net * qty,
        }
      })

      try {
        const { data: order, error: oErr } = await supabaseAdmin
          .from('orders')
          .insert({
            dist_id,
            pharmacy_name: pharmacy_name ? String(pharmacy_name).trim().slice(0, 200) : null,
            total_before,
            total_after,
            item_count: validatedItems.length,
            status: 'pending',
          })
          .select()
          .single()

        if (oErr) return res.status(400).json({ error: oErr.message })

        const itemRows = validatedItems.map(i => ({ ...i, order_id: order.id }))
        const { error: iErr } = await supabaseAdmin.from('order_items').insert(itemRows)
        if (iErr) return res.status(400).json({ error: iErr.message })

        return res.status(201).json({ orderId: order.id, total_after, item_count: validatedItems.length })
      } catch (err) {
        return handleError(res, err)
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
