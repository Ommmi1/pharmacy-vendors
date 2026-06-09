import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res)
  if (!user) return
  const db = getSupabaseAdmin() as any
  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('distributors').select('*').eq('id', id).single()
      if (error || !data) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(data)
    } catch (e) { return handleError(res, e) }
  }

  if (req.method === 'PATCH') {
    const { name, phone, whatsapp, address, city, disabled } = req.body
    const updates: Record<string, unknown> = {}
    if (name      !== undefined) updates.name     = name
    if (phone     !== undefined) updates.phone    = phone
    if (whatsapp  !== undefined) updates.whatsapp = whatsapp
    if (address   !== undefined) updates.address  = address
    if (city      !== undefined) updates.city     = city
    if (disabled  !== undefined) updates.disabled = disabled
    try {
      const { data, error } = await db.from('distributors').update(updates).eq('id', id).select().single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) { return handleError(res, e) }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('distributors').delete().eq('id', id)
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ deleted: true })
    } catch (e) { return handleError(res, e) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
