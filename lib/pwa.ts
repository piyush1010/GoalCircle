'use client'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let installPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function getInstallPrompt() {
  return installPrompt
}

export function setInstallPrompt(prompt: BeforeInstallPromptEvent | null) {
  installPrompt = prompt
  listeners.forEach((listener) => listener())
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
