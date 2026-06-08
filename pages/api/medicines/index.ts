import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
import { getAuthUser, unauthorized, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthUser(req, res)
  if (!user) return unauthorized(res)

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('medicines')
        .select('*')
        .eq('dist_id', user.id)
        .order('company', { ascending: true })
        .order('name', { ascending: true })

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (err) {
      return handleError(res, err)
    }
  }

  if (req.method === 'POST') {
    const { code, name, company, tp, disc, bonus, stock } = req.body

    if (!name || tp === undefined || tp === null) {
      return res.status(400).json({ error: 'Medicine name and trade price are required.' })
    }
    if (Number(tp) <= 0) {
      return res.status(400).json({ error: 'Trade price must be greater than 0.' })
    }

    try {
      const { data, error } = await db
        .from('medicines')
        .insert({
          dist_id: user.id,
          code:    code    || null,
          name:    String(name).trim(),
          company: company || null,
          tp:      Number(tp),
          disc:    Number(disc) || 0,
          bonus:   bonus   || null,
          stock:   Number(stock) || 999,
        })
        .select()
        .single()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json(data)
    } catch (err) {
      return handleError(res, err)
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
