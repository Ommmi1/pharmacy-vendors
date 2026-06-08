import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthUser, getProfile, unauthorized, handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getAuthUser(req, res)
    if (!user) return unauthorized(res)

    const profile = await getProfile(user.id)

    return res.status(200).json({
      user: { id: user.id, email: user.email },
      profile,
    })
  } catch (err) {
    return handleError(res, err)
  }
}
