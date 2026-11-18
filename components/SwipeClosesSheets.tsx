'use client'

import { useEffect } from 'react'
import { closeModal } from '@/components/BackClosesSheets'

/** A bottom sheet on a phone: rounded at the top, square at the bottom, sitting on the bottom edge. */
function bottomSheet(target: EventTarget | null): HTMLElement | null {
  const sheet = (target as HTMLElement | null)?.closest?.<HTMLElement>('[role="dialog"][aria-modal="true"], form[aria-modal="true"]')
  if (!sheet) return null
  const cs = getComputedStyle(sheet)
  if (cs.position === 'fixed') return null // a full-screen layer, such as the focus timer
  const r = sheet.getBoundingClientRect()
  return parseFloat(cs.borderTopLeftRadius) > 0 && parseFloat(cs.borderBottomLeftRadius) === 0 && r.bottom >= window.innerHeight - 4 ? sheet : null
}

/** Is the finger on something that scrolls and isn't at its top? Then the swipe should scroll it, not close. */
function scrolledInside(target: HTMLElement, sheet: HTMLElement) {
  for (let el: HTMLElement | null = target; el; el = el.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true
    if (el === sheet) break
  }
  return false
}

/**
 * On phones, pull a bottom sheet down to close it, as in Google Maps or WhatsApp. It follows the finger;
 * let go past about a third of its height (or flick it) and it closes the same way its Close button does,
 * otherwise it springs back.
 */
export default function SwipeClosesSheets() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return
    let sheet: HTMLElement | null = null
    let startX = 0, startY = 0, dy = 0
    let trail: { y: number; t: number }[] = [] // recent finger positions, for the speed of a flick
    let mode: 'undecided' | 'drag' | 'off' = 'off'

    const reset = (el: HTMLElement, animate: boolean) => {
      el.style.transition = animate ? 'transform 200ms ease-out' : ''
      el.style.transform = ''
      if (animate) window.setTimeout(() => { el.style.transition = '' }, 220)
    }

    const onStart = (e: TouchEvent) => {
      mode = 'off'
      if (e.touches.length !== 1) return
      const target = e.target as HTMLElement
      const found = bottomSheet(target)
      if (!found || target.closest('input, textarea, select, [contenteditable="true"], [data-no-swipe]') || scrolledInside(target, found)) return
      sheet = found
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; dy = 0; trail = []
      mode = 'undecided'
    }

    const onMove = (e: TouchEvent) => {
      if (mode === 'off' || !sheet) return
      const x = e.touches[0].clientX - startX
      const y = e.touches[0].clientY - startY
      if (mode === 'undecided') {
        if (Math.abs(x) < 8 && Math.abs(y) < 8) return
        if (y <= 0 || Math.abs(x) > y) { mode = 'off'; return } // sideways or upwards: leave it to the page
        mode = 'drag'
      }
      dy = Math.max(0, y)
      const now = performance.now()
      trail.push({ y, t: now })
      trail = trail.filter((p) => now - p.t <= 120)
      e.preventDefault()
      sheet.style.transition = 'none'
      sheet.style.transform = `translateY(${dy}px)`
    }

    const onEnd = () => {
      if (mode !== 'drag' || !sheet) { mode = 'off'; return }
      mode = 'off'
      const el = sheet
      sheet = null
      const first = trail[0], last = trail.at(-1)
      const speed = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0 // px per ms
      const far = dy > Math.min(160, el.offsetHeight * 0.33)
      if (!far && !(speed > 0.5 && dy > 40)) { reset(el, true); return }
      el.style.transition = 'transform 160ms ease-in'
      el.style.transform = `translateY(${el.offsetHeight}px)`
      window.setTimeout(() => closeModal(el, (closed) => { if (!closed) reset(el, true) }), 150)
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return null
}
