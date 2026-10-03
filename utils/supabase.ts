import { createClient } from '@supabase/supabase-js'

// Clean and format the Supabase URL to remove /rest/v1 or trailing slashes
let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(
  rawUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)