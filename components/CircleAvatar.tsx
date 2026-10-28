import Image from 'next/image'

// Quiet, muted tones for monograms. Picked from the name so a batch always gets the same one.
const TONES = [
  { bg: '#EFE7DA', fg: '#7A4A0C' }, // saffron
  { bg: '#E3E8EF', fg: '#2F4A6B' }, // slate blue
  { bg: '#DFEAE6', fg: '#1F5A4C' }, // teal
  { bg: '#EAE2EC', fg: '#5B3866' }, // plum
  { bg: '#E7E9DD', fg: '#4D5626' }, // olive
  { bg: '#ECE3E0', fg: '#7A3B2C' }, // clay
]

function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const word = words[0] || '?'
  // "Upsc1" -> "U1", "Physics" -> "PH"
  const digit = word.match(/\d/)
  return (word[0] + (digit ? digit[0] : word[1] || '')).toUpperCase()
}

function toneFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

/** A batch's photo or logo; a clean two-letter monogram when it has none. */
export default function CircleAvatar({ name, url, size = 48, className = '' }: { name: string; url?: string | null; size?: number; className?: string }) {
  const radius = Math.round(size * 0.28)
  if (url) {
    return <span className={`relative inline-block shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`} style={{ width: size, height: size, borderRadius: radius }}>
      <Image src={url} alt="" fill unoptimized sizes={`${size}px`} className="object-cover" />
    </span>
  }
  const tone = toneFor(name)
  return <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center font-semibold tracking-tight ${className}`} style={{ width: size, height: size, borderRadius: radius, background: tone.bg, color: tone.fg, fontSize: Math.round(size * 0.36) }}>
    {monogram(name)}
  </span>
}
