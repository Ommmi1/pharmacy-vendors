import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { slug } = req.query as { slug: string }
  const db = getSupabaseAdmin() as any
  try {
    const { data: dist, error: dErr } = await db
      .from('distributors').select('*').eq('slug', slug).eq('disabled', false).single()
    if (dErr || !dist) return res.status(404).json({ error: 'Distributor not found' })
    const { data: meds } = await db
      .from('medicines').select('id,code,name,company,mrp,tp,disc,net,bonus,stock')
      .eq('dist_id', dist.id).order('company').order('name')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ distributor: dist, medicines: meds || [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return res.status(500).json({ error: msg })
  }
}
