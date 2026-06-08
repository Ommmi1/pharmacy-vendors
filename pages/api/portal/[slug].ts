import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
import { handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { slug } = req.query
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'Invalid slug' })

  try {
    const { data: profile, error: pErr } = await db
      .from('profiles')
      .select('id, biz_name, phone, city, address, whatsapp')
      .eq('slug', slug)
      .eq('onboarded', true)
      .single()

    if (pErr || !profile) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    const { data: medicines, error: mErr } = await db
      .from('medicines')
      .select('id, code, name, company, tp, disc, net, bonus, stock')
      .eq('dist_id', profile.id)
      .order('company')
      .order('name')

    if (mErr) return res.status(400).json({ error: mErr.message })

    // Cache for 60 seconds on CDN — medicines don't change that fast
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

    return res.status(200).json({
      distributor: {
        id:      profile.id,
        bizName: profile.biz_name,
        phone:   profile.phone,
        city:    profile.city,
        address: profile.address,
        whatsapp:profile.whatsapp,
      },
      medicines: medicines || [],
    })
  } catch (err) {
    return handleError(res, err)
  }
}
