import { createClient } from '@supabase/supabase-js'

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(
  rawUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)