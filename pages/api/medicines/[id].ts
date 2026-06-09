import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getSupabaseAdmin() as any
  const user = await getAuthUser(req, res)
  if (!user) return unauthorized(res)

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' })

  if (req.method === 'DELETE') {
    try {
      // Verify ownership before deleting
      const { data: med } = await db
      .from('medicines')
      .select('id, dist_id')
      .eq('id', id)
      .single() as { data: { id: string; dist_id: string } | null }
      if (!med) return res.status(404).json({ error: 'Medicine not found' })
      if (med.dist_id !== user.id) return res.status(403).json({ error: 'Forbidden' })

      const { error } = await db.from('medicines').delete().eq('id', id)
      if (error) return res.status(400).json({ error: error.message })

      return res.status(200).json({ deleted: true })
    } catch (err) {
      return handleError(res, err)
    }
  }

  if (req.method === 'PATCH') {
    try {
       const { data: med } = await db
  .from('medicines')
  .select('id, dist_id')
  .eq('id', id)
  .single() as { data: { id: string; dist_id: string } | null }
      if (!med) return res.status(404).json({ error: 'Medicine not found' })
      if (med.dist_id !== user.id) return res.status(403).json({ error: 'Forbidden' })

      const { code, name, company, tp, disc, bonus, stock } = req.body
      const updates: Record<string, unknown> = {}
      if (code    !== undefined) updates.code    = code
      if (name    !== undefined) updates.name    = name
      if (company !== undefined) updates.company = company
      if (tp      !== undefined) updates.tp      = Number(tp)
      if (disc    !== undefined) updates.disc    = Number(disc)
      if (bonus   !== undefined) updates.bonus   = bonus
      if (stock   !== undefined) updates.stock   = Number(stock)

      const { data, error } = await (db as any)
  .from('medicines')
  .update(updates)
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
