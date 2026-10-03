import { createClient } from '@supabase/supabase-js'

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// Automatically strip trailing /rest/v1 or slashes if present in env vars
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!rawUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables.')
}

export const supabase = createClient(rawUrl, supabaseAnonKey)