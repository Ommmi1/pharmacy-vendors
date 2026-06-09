import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res)
  if (!user) return
  const db = getSupabaseAdmin() as any
  const { id } = req.query as { id: string }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('medicines').delete().eq('id', id)
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ deleted: true })
    } catch (e) { return handleError(res, e) }
  }

  if (req.method === 'PATCH') {
    const { code, name, company, mrp, tp, disc, bonus, stock } = req.body
    const u: Record<string, unknown> = {}
    if (code    !== undefined) u.code    = code
    if (name    !== undefined) u.name    = name
    if (company !== undefined) u.company = company
    if (mrp     !== undefined) u.mrp     = parseFloat(mrp)
    if (tp      !== undefined) u.tp      = parseFloat(tp)
    if (disc    !== undefined) u.disc    = parseFloat(disc)
    if (bonus   !== undefined) u.bonus   = bonus
    if (stock   !== undefined) u.stock   = parseInt(stock)
    try {
      const { data, error } = await db.from('medicines').update(u).eq('id', id).select().single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) { return handleError(res, e) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
