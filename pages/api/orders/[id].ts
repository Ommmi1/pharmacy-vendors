import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
import { getAuthUser, unauthorized, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthUser(req, res)
  if (!user) return unauthorized(res)

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' })

  if (req.method === 'GET') {
    try {
      const { data: order, error: oErr } = await db
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('dist_id', user.id)
        .single()

      if (oErr || !order) return res.status(404).json({ error: 'Order not found' })

      const { data: items, error: iErr } = await db
        .from('order_items')
        .select('*')
        .eq('order_id', id)
        .order('name')

      if (iErr) return res.status(400).json({ error: iErr.message })
      return res.status(200).json({ ...order, items: items || [] })
    } catch (err) {
      return handleError(res, err)
    }
  }

  if (req.method === 'PATCH') {
    const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']
    const { status } = req.body

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    try {
      // Verify ownership
      const { data: order } = await db
        .from('orders')
        .select('id, dist_id')
        .eq('id', id)
        .single()

      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (order.dist_id !== user.id) return res.status(403).json({ error: 'Forbidden' })

      const { data, error } = await db
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (err) {
      return handleError(res, err)
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
