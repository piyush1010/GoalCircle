import { createClient } from '@supabase/supabase-js'

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const directUrl = rawUrl || 'https://placeholder.supabase.co'
const directHost = new URL(directUrl).hostname

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Some Indian networks (Jio, and at times Airtel and ACT) block *.supabase.co, so sign-up and every
 * screen fail with "Failed to fetch". In the browser on the live site we reach Supabase through our
 * own domain instead: goalyaar.in/sb/... is passed on to Supabase by a rewrite in next.config.
 * Local development and the server keep talking to Supabase directly.
 */
function apiUrl(): string {
  if (typeof window === 'undefined' || !directHost.endsWith('.supabase.co')) return directUrl
  const { protocol, hostname, origin } = window.location
  if (protocol !== 'https:' || hostname === 'localhost') return directUrl
  return `${origin}/sb`
}

export const supabase = createClient(
  apiUrl(),
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // The name the direct address gives, so people already signed in stay signed in.
      storageKey: `sb-${directHost.split('.')[0]}-auth-token`,
    },
  }
)
