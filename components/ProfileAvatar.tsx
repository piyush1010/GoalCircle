'use client'

import Image from 'next/image'

// Avatar styles: a muted tone with your initials. (Ids are kept so saved choices still work.)
export const AVATAR_PRESETS = [
  { id: 'orbit', label: 'Saffron', glyph: '', colors: ['#EFE7DA', '#7A4A0C'] },
  { id: 'comet', label: 'Slate', glyph: '', colors: ['#E3E8EF', '#2F4A6B'] },
  { id: 'sprout', label: 'Teal', glyph: '', colors: ['#DFEAE6', '#1F5A4C'] },
  { id: 'nova', label: 'Plum', glyph: '', colors: ['#EAE2EC', '#5B3866'] },
  { id: 'summit', label: 'Clay', glyph: '', colors: ['#ECE3E0', '#7A3B2C'] },
  { id: 'wave', label: 'Ink', glyph: '', colors: ['#121212', '#FAFAF7'] },
  { id: 'echo', label: 'Olive', glyph: '', colors: ['#E7E9DD', '#4D5626'] },
  { id: 'spark', label: 'Sand', glyph: '', colors: ['#F1ECE2', '#5C5C57'] },
] as const

const initials = (name?: string) => {
  const words = (name || 'G').trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] || 'G') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

export default function ProfileAvatar({ value, name, size = 56, className = '' }: { value?: string | null; name?: string; size?: number; className?: string }) {
  const preset = value?.startsWith('preset:') ? AVATAR_PRESETS.find((item) => item.id === value.slice(7)) : null
  if (preset) return <div role="img" aria-label={`${name || 'Your'} avatar`} className={`grid shrink-0 place-items-center overflow-hidden font-semibold tracking-tight ${className}`} style={{ width: size, height: size, background: preset.colors[0], color: preset.colors[1], fontSize: size * 0.36 }}>{initials(name)}</div>
  if (value) return <Image src={value} alt={name ? `${name}'s profile picture` : 'Profile picture'} width={size} height={size} unoptimized className={`shrink-0 object-cover ${className}`} style={{ width: size, height: size }} />
  return <div role="img" aria-label="Initials avatar" className={`grid shrink-0 place-items-center font-semibold tracking-tight ${className}`} style={{ width: size, height: size, fontSize: size * 0.36, background: '#EFE7DA', color: '#7A4A0C' }}>{initials(name)}</div>
}
