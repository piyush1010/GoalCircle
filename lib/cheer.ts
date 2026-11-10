/** A short confirmation after a check-in. Plain text: no mascot, no emoji. */
export const CHEER_LINES = ['Checked in. Well done.', 'Logged. One more day of progress.', 'Done for today. Good work.', 'Saved. That is how streaks are built.']
export const CHEER_EVENT = 'goalcircle:cheer'

/** Show the confirmation (after a check-in). Survives the page change that follows. */
export function cheer() {
  try { window.sessionStorage.setItem('goalcircle-cheer', '1') } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CHEER_EVENT))
}
