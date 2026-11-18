/**
 * "Done. Undo" notes at the bottom of the screen, for changes that are easy to reverse (as in Gmail).
 * The change happens straight away; Undo puts it back. UndoHost (mounted in AppShell) shows them, so a
 * note stays visible even if the page changes underneath it.
 */
export interface UndoRequest {
  text: string
  undo: () => Promise<boolean>
  /** Where to go once the undo has worked, if the page the person is on no longer fits. */
  thenGo?: string
}

export const UNDO_EVENT = 'goalyaar:undo'

export function showUndo(text: string, undo: () => Promise<boolean>, thenGo?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<UndoRequest>(UNDO_EVENT, { detail: { text, undo, thenGo } }))
}
