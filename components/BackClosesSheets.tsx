'use client'

import { useEffect } from 'react'

const MODAL = '[aria-modal="true"], [role="menu"]' // pop-up sheets and small menus, never cards inside the page
const CLOSE_WORDS = ['close', 'cancel', 'not now', 'skip', 'skip tips', 'dismiss', 'minimise']

const topModal = () => {
  const all = [...document.querySelectorAll<HTMLElement>(MODAL)].filter((el) => el.isConnected && el.getClientRects().length > 0)
  return all.at(-1) ?? null
}

/** Close a sheet the way a person would: Escape, then its Close, Cancel or Minimise button, then a tap on the dimmed backdrop. */
export function closeModal(modal: HTMLElement, done: (closed: boolean) => void) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  window.setTimeout(() => {
    if (!modal.isConnected) return done(true)
    const buttons = [...modal.querySelectorAll<HTMLButtonElement>('button')]
    const isClose = (t: string | null) => { const w = (t ?? '').trim().toLowerCase(); return CLOSE_WORDS.includes(w) || w.startsWith('close ') }
    const button = buttons.find((b) => isClose(b.getAttribute('aria-label'))) ?? buttons.find((b) => isClose(b.textContent))
    if (button && !button.disabled) button.click()
    else {
      const backdrop = getComputedStyle(modal).position === 'fixed' ? modal : modal.parentElement // some sheets mark the dimmed layer itself
      if (backdrop && getComputedStyle(backdrop).position === 'fixed') backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    window.setTimeout(() => done(!modal.isConnected), 60)
  }, 30)
}

/**
 * On phones, and in the Android app, the back button closes an open sheet or menu instead of leaving the page.
 * While a sheet is open, one extra history entry (same URL) is kept; back removes it and closes the sheet.
 * Closing the sheet any other way removes the entry again, so history stays as it was.
 */
export default function BackClosesSheets() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return
    let marked = false
    let markedAt = ''
    let skip = 0
    let frame = 0

    const sync = () => {
      frame = 0
      const open = Boolean(topModal())
      if (open && !marked) {
        window.history.pushState({ ...(window.history.state ?? {}), gySheet: true }, '')
        marked = true
        markedAt = window.location.href
      } else if (!open && marked) {
        marked = false
        // Only step back if we're still on the entry we added (a link inside the sheet may have navigated).
        if (window.history.state?.gySheet && window.location.href === markedAt) { skip++; window.history.back() }
      }
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(sync) }

    const onPop = () => {
      if (skip) { skip--; return }
      if (!marked) return
      marked = false
      const modal = topModal()
      if (!modal) return
      closeModal(modal, (closed) => { if (!closed) schedule() }) // couldn't close: keep the sheet's entry
    }

    // Start only after Next's router has set itself up (its effect runs after ours, as our parent),
    // so every entry we add carries the router's state and back never reloads the page.
    const observer = new MutationObserver(schedule)
    const start = window.setTimeout(() => {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] })
      window.addEventListener('popstate', onPop)
      schedule()
    }, 800)
    return () => { window.clearTimeout(start); observer.disconnect(); window.removeEventListener('popstate', onPop); if (frame) window.cancelAnimationFrame(frame) }
  }, [])

  return null
}
