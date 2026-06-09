import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin, handleError } from '@/lib/auth'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getSupabaseAdmin() as any

  if (req.method === 'GET') {
    const { dist_id } = req.query
    if (!dist_id) return res.status(400).json({ error: 'dist_id required' })
    try {
      const { data, error } = await db
        .from('medicines').select('*')
        .eq('dist_id', dist_id)
        .order('company').order('name')
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) { return handleError(res, e) }
  }

  const user = await requireAdmin(req, res)
  if (!user) return

  if (req.method === 'POST') {
    // Single add OR bulk import (array)
    const body = req.body
    const isBulk = Array.isArray(body.medicines)

    if (isBulk) {
      const { dist_id, medicines } = body
      if (!dist_id || !medicines?.length) return res.status(400).json({ error: 'dist_id and medicines required' })
      const rows = medicines.map((m: any) => ({
        dist_id,
        code:    m.code    || null,
        name:    String(m.name).trim(),
        company: m.company || null,
        mrp:     parseFloat(m.mrp)  || 0,
        tp:      parseFloat(m.tp)   || 0,
        disc:    parseFloat(m.disc) || 0,
        bonus:   m.bonus   || null,
        stock:   parseInt(m.stock)  || 999,
      })).filter((r: any) => r.name && r.tp > 0)
      try {
        let inserted = 0
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await db.from('medicines').insert(rows.slice(i, i + 500))
          if (error) return res.status(400).json({ error: error.message })
          inserted += Math.min(500, rows.length - i)
        }
        return res.status(201).json({ inserted })
      } catch (e) { return handleError(res, e) }
    }

    // Single medicine
    const { dist_id, code, name, company, mrp, tp, disc, bonus, stock } = body
    if (!dist_id || !name || !tp) return res.status(400).json({ error: 'dist_id, name and tp required' })
    try {
      const { data, error } = await db.from('medicines').insert({
        dist_id, code: code || null, name: String(name).trim(),
        company: company || null,
        mrp: parseFloat(mrp) || 0, tp: parseFloat(tp),
        disc: parseFloat(disc) || 0, bonus: bonus || null,
        stock: parseInt(stock) || 999,
      }).select().single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json(data)
    } catch (e) { return handleError(res, e) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
