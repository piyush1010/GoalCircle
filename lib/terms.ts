import { supabase } from '@/utils/supabase'
import { confirmAction } from '@/lib/confirm'

/** Bump when the rules change in a way people should agree to again. */
export const TERMS_VERSION = '2026-11-25'

/**
 * Google Play asks that people agree to the rules before they post anything others can see.
 * Asks once per account (saved on the account, so it follows them to other devices) and
 * returns true when they have agreed.
 */
export async function ensureTermsAccepted(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  if (session.user.user_metadata?.terms_version === TERMS_VERSION) return true
  const ok = await confirmAction(
    'Before you post: be kind, keep it about goals and studies, and share only what you have the right to share. No abuse, hate, sexual content, spam, cheating or anything that puts someone at risk. Posts that break these rules are removed, and repeat offenders lose their account. The full rules are at goalyaar.in/terms.',
    { confirmLabel: 'I agree', danger: false },
  )
  if (!ok) return false
  await supabase.auth.updateUser({ data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() } })
  return true
}
