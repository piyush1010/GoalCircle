// One nudge at a time. Install-the-app, notifications and welcome-back each ask to be shown;
// only the first to ask in a browser session gets the screen, and nothing appears on someone's
// first day, so a new user sees the app itself first.
const SESSION_KEY = 'goalyaar-nudge-shown'
const FIRST_SEEN_KEY = 'goalyaar-first-seen'

export type Nudge = 'install' | 'push' | 'welcome-back'

export function claimNudge(name: Nudge, opts: { allowFirstDay?: boolean } = {}): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10)
    let first = window.localStorage.getItem(FIRST_SEEN_KEY)
    if (!first) { first = today; window.localStorage.setItem(FIRST_SEEN_KEY, today) }
    if (first === today && !opts.allowFirstDay) return false
    const shown = window.sessionStorage.getItem(SESSION_KEY)
    if (shown && shown !== name) return false
    window.sessionStorage.setItem(SESSION_KEY, name)
    return true
  } catch {
    return true // storage unavailable: behave as before
  }
}
