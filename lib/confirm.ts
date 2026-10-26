/**
 * In-app confirmation instead of window.confirm. Browser popups can be blocked silently
 * (some in-app browsers and webviews return "cancel" without showing anything), which made
 * buttons like Delete look broken. ConfirmHost (mounted in AppShell) shows this dialog.
 */
export interface ConfirmRequest { message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void }

export const CONFIRM_EVENT = 'goalcircle:confirm'

const labelFor = (message: string) => {
  const word = message.match(/^(Delete|Remove|Leave|Use)\b/)?.[1]
  return word === 'Use' ? 'Yes, use it' : word ?? 'Yes'
}

export function confirmAction(message: string, options: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const detail: ConfirmRequest = {
      message,
      confirmLabel: options.confirmLabel ?? labelFor(message),
      danger: options.danger ?? /^(Delete|Remove|Leave)\b/.test(message),
      resolve,
    }
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail }))
  })
}
