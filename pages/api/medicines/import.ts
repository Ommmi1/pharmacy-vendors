import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser, unauthorized, handleError } from '@/lib/auth'

// Next.js default body size is 4mb — increase for large catalogs
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

interface MedicineRow {
  code?: string
  name: string
  company?: string
  tp: number
  disc?: number
  bonus?: string
  stock?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getSupabaseAdmin() as any
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getAuthUser(req, res)
  if (!user) return unauthorized(res)

  const { medicines } = req.body as { medicines: MedicineRow[] }

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: 'No medicines provided.' })
  }

  if (medicines.length > 2000) {
    return res.status(400).json({ error: 'Maximum 2000 medicines per import.' })
  }

  // Validate and sanitize every row server-side
  const errors: string[] = []
  const rows = medicines.map((m, i) => {
    const rowNum = i + 1
    if (!m.name || typeof m.name !== 'string') {
      errors.push(`Row ${rowNum}: name is required.`)
    }
    const tp = Number(m.tp)
    if (isNaN(tp) || tp <= 0) {
      errors.push(`Row ${rowNum}: tp must be a positive number.`)
    }
    return {
      dist_id: user.id,
      code:    m.code    ? String(m.code).trim()    : null,
      name:    String(m.name || '').trim(),
      company: m.company ? String(m.company).trim() : null,
      tp,
      disc:    Number(m.disc) || 0,
      bonus:   m.bonus   ? String(m.bonus).trim()   : null,
      stock:   Number(m.stock) || 999,
    }
  })

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.slice(0, 5).join(' ') + (errors.length > 5 ? ` (+${errors.length - 5} more)` : '') })
  }

  try {
    // Insert in batches of 500 to avoid hitting Supabase limits
    const BATCH = 500
    let inserted = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await db.from('medicines').insert(batch)
      if (error) return res.status(400).json({ error: error.message })
      inserted += batch.length
    }

    return res.status(201).json({ inserted })
  } catch (err) {
    return handleError(res, err)
  }
}
