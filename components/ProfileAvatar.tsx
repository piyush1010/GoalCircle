'use client'

import Image from 'next/image'

export const AVATAR_PRESETS = [
  { id: 'orbit', label: 'Orbit', glyph: '◉', colors: ['#f59e0b', '#7c3aed'] },
  { id: 'comet', label: 'Comet', glyph: '✦', colors: ['#06b6d4', '#2563eb'] },
  { id: 'sprout', label: 'Sprout', glyph: '◆', colors: ['#34d399', '#0f766e'] },
  { id: 'nova', label: 'Nova', glyph: '✺', colors: ['#fb7185', '#7c3aed'] },
  { id: 'summit', label: 'Summit', glyph: '▲', colors: ['#fbbf24', '#ea580c'] },
  { id: 'wave', label: 'Wave', glyph: '≈', colors: ['#38bdf8', '#4f46e5'] },
  { id: 'echo', label: 'Echo', glyph: '◎', colors: ['#a78bfa', '#db2777'] },
  { id: 'spark', label: 'Spark', glyph: '✧', colors: ['#2dd4bf', '#65a30d'] },
] as const

export default function ProfileAvatar({ value, name, size = 56, className = '' }: { value?: string | null; name?: string; size?: number; className?: string }) {
  const preset = value?.startsWith('preset:') ? AVATAR_PRESETS.find((item) => item.id === value.slice(7)) : null
  if (preset) return <div role="img" aria-label={`${preset.label} abstract avatar`} className={`grid shrink-0 place-items-center overflow-hidden font-black text-white shadow-sm ${className}`} style={{ width: size, height: size, background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`, fontSize: size * 0.42 }}>{preset.glyph}</div>
  if (value) return <Image src={value} alt={name ? `${name}'s profile picture` : 'Profile picture'} width={size} height={size} unoptimized className={`shrink-0 object-cover ${className}`} style={{ width: size, height: size }} />
  return <div role="img" aria-label="Initials avatar" className={`grid shrink-0 place-items-center bg-amber-500/15 font-black text-amber-600 dark:text-amber-400 ${className}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>{(name || 'G').charAt(0).toUpperCase()}</div>
}
