import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'
import { handleError } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, fullName } = req.body

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  try {
    // Create the auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // sends verification email
      user_metadata: { full_name: fullName },
    })

    if (error) return res.status(400).json({ error: error.message })

    // Create the profile row immediately
    await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      onboarded: false,
    })

    return res.status(201).json({ message: 'Account created. Check your email to verify.' })
  } catch (err) {
    return handleError(res, err)
  }
}
