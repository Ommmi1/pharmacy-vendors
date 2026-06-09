import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getSupabaseAdmin() as any

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('distributors').select('*').order('name')
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) { return handleError(res, e) }
  }

  if (req.method === 'POST') {
    const user = await requireAdmin(req, res)
    if (!user) return
    const { name, slug, phone, whatsapp, address, city } = req.body
    if (!name?.trim() || !slug?.trim()) return res.status(400).json({ error: 'Name and slug are required.' })
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: 'Slug: lowercase letters, numbers, hyphens only.' })
    try {
      const { data: existing } = await db.from('distributors').select('id').eq('slug', slug).single()
      if (existing) return res.status(409).json({ error: 'Slug already taken.' })
      const { data, error } = await db.from('distributors').insert({
        name: name.trim(), slug: slug.trim(),
        phone: phone || null, whatsapp: whatsapp || null,
        address: address || null, city: city || null,
      }).select().single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json(data)
    } catch (e) { return handleError(res, e) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
