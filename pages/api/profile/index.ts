import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getSupabaseAdmin() as any
  const user = await getAuthUser(req, res)
  if (!user) return unauthorized(res)

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) return res.status(404).json({ error: 'Profile not found' })
      return res.status(200).json(data)
    } catch (err) {
      return handleError(res, err)
    }
  }

  if (req.method === 'PATCH') {
    const { biz_name, phone, city, address, whatsapp, low_level, slug, onboarded } = req.body

    // Validate slug if provided
    if (slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug: lowercase letters, numbers, and hyphens only.' })
      }
      // Check uniqueness
      const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .neq('id', user.id)
        .single()

      if (existing) {
        return res.status(409).json({ error: 'That URL slug is already taken.' })
      }
    }

    try {
      const updates: Record<string, unknown> = {}
      if (biz_name  !== undefined) updates.biz_name  = biz_name
      if (phone     !== undefined) updates.phone     = phone
      if (city      !== undefined) updates.city      = city
      if (address   !== undefined) updates.address   = address
      if (whatsapp  !== undefined) updates.whatsapp  = whatsapp
      if (low_level !== undefined) updates.low_level = Number(low_level)
      if (slug      !== undefined) updates.slug      = slug
      if (onboarded !== undefined) updates.onboarded = onboarded

      const { data, error } = await db
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
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
