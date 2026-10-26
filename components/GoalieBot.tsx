'use client'

import { useId } from 'react'

export type GoalieMood = 'normal' | 'happy' | 'wave' | 'think' | 'sleepy'

/**
 * Goalie: GoalCircle's guide bot. Original artwork in SVG, shaded with gradients so it reads as a
 * soft 3D toy. A few KB, no image files. Animation classes live in globals.css.
 */
export function GoalieBot({ size = 56, mood = 'normal' }: { size?: number; mood?: GoalieMood }) {
  const id = useId().replace(/:/g, '')
  const g = (name: string) => `${name}-${id}`
  const url = (name: string) => `url(#${g(name)})`

  const eyes = {
    // ^ ^ smiling eyes
    happy: <g>
      <path d="M20 33.5 Q24.5 27 29 33.5" stroke={url('eye')} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M35 33.5 Q39.5 27 44 33.5" stroke={url('eye')} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </g>,
    // looking up and to the side
    think: <g className="goalie-eyes">
      <ellipse cx="25.5" cy="30.5" rx="4" ry="4.8" fill={url('eye')} />
      <ellipse cx="40.5" cy="30.5" rx="4" ry="4.8" fill={url('eye')} />
      <circle cx="26.5" cy="28.6" r="1.5" fill="#fff" />
      <circle cx="41.5" cy="28.6" r="1.5" fill="#fff" />
    </g>,
    // half-closed, drowsy lids
    sleepy: <g>
      <path d="M20 31 Q24.5 38 29 31 Z" fill={url('eye')} />
      <path d="M35 31 Q39.5 38 44 31 Z" fill={url('eye')} />
      <path d="M19.5 31 H29.5 M34.5 31 H44.5" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
    </g>,
    normal: <g className="goalie-eyes">
      <ellipse cx="24.5" cy="32" rx="4.6" ry="5.4" fill={url('eye')} />
      <ellipse cx="39.5" cy="32" rx="4.6" ry="5.4" fill={url('eye')} />
      <circle cx="23" cy="30" r="1.6" fill="#fff" />
      <circle cx="38" cy="30" r="1.6" fill="#fff" />
      <circle cx="26" cy="34.2" r="0.8" fill="#fff" opacity="0.8" />
      <circle cx="41" cy="34.2" r="0.8" fill="#fff" opacity="0.8" />
    </g>,
  }[mood === 'wave' ? 'normal' : mood]

  const mouth = {
    happy: <path d="M27 39.5 Q32 46 37 39.5 Z" fill="#bdf4ff" stroke="#bdf4ff" strokeWidth="1.2" strokeLinejoin="round" />,
    wave: <path d="M27.5 39.8 Q32 45 36.5 39.8 Z" fill="#bdf4ff" stroke="#bdf4ff" strokeWidth="1.2" strokeLinejoin="round" />,
    think: <circle cx="35" cy="41.5" r="1.8" fill="#bdf4ff" />,
    sleepy: <ellipse cx="32" cy="41.8" rx="2" ry="1.4" fill="#bdf4ff" />,
    normal: <path d="M28 40.5 Q32 44 36 40.5" stroke="#bdf4ff" strokeWidth="2.2" fill="none" strokeLinecap="round" />,
  }[mood]

  const blush = mood === 'happy' || mood === 'wave' ? 0.9 : 0.7

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0 overflow-visible">
      <defs>
        <radialGradient id={g('head')} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#fbbf24" />
          <stop offset="0.8" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#c2620a" />
        </radialGradient>
        <linearGradient id={g('screen')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24324d" />
          <stop offset="1" stopColor="#0a1222" />
        </linearGradient>
        <radialGradient id={g('eye')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#bdf4ff" />
          <stop offset="1" stopColor="#38bdf8" />
        </radialGradient>
        <radialGradient id={g('ball')} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        <radialGradient id={g('ear')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id={g('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('shine')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft shadow on the ground; stays put while Goalie moves. */}
      <ellipse cx="32" cy="61" rx="17" ry="2.6" fill={url('shadow')} />

      <g className={mood === 'happy' ? 'goalie-hop' : mood === 'sleepy' ? 'goalie-doze' : 'goalie-bob'}>
        {/* Antenna with a glowing ball */}
        <g className="goalie-antenna">
          <path d="M32 14 Q31 9 33 6.5" stroke="#b45309" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="33.5" cy="5.5" r="4.4" fill={url('ball')} />
          <circle cx="32.2" cy="4.2" r="1.3" fill="#fff" opacity="0.9" />
        </g>

        {/* Little feet */}
        <ellipse cx="23" cy="57" rx="5.5" ry="3" fill={url('ear')} />
        <ellipse cx="41" cy="57" rx="5.5" ry="3" fill={url('ear')} />

        {/* Ears */}
        <circle cx="7.5" cy="34" r="5" fill={url('ear')} />
        <circle cx="56.5" cy="34" r="5" fill={url('ear')} />

        {/* Waving arm, behind the head */}
        {mood === 'wave' && <g className="goalie-wave">
          <path d="M54 38 Q61 33 61 25" stroke="#d97706" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <circle cx="61" cy="22" r="4.6" fill={url('ear')} />
        </g>}

        {/* Round head */}
        <rect x="7" y="12" width="50" height="45" rx="22" fill={url('head')} />
        <ellipse cx="22" cy="18.5" rx="10" ry="4" fill={url('shine')} opacity="0.75" transform="rotate(-14 22 18.5)" />

        {/* Face screen */}
        <rect x="13" y="21" width="38" height="27" rx="13.5" fill={url('screen')} />
        <path d="M19 24.5 Q32 21.5 45 24.5" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2" fill="none" strokeLinecap="round" />

        {eyes}

        {/* Blush and mouth */}
        <ellipse cx="18.5" cy="40" rx="3" ry="1.7" fill="#f472b6" opacity={blush} />
        <ellipse cx="45.5" cy="40" rx="3" ry="1.7" fill="#f472b6" opacity={blush} />
        {mouth}

        {/* Thinking dots */}
        {mood === 'think' && <g fill="#fbbf24">
          <circle cx="57" cy="15" r="1.7" className="goalie-dot" />
          <circle cx="61.5" cy="9.5" r="2.3" className="goalie-dot" style={{ animationDelay: '.25s' }} />
        </g>}

        {/* Zzz */}
        {mood === 'sleepy' && <text x="51" y="13" fontSize="9" fontWeight="900" fill="#94a3b8" className="goalie-zzz">z<tspan dx="1" dy="-5" fontSize="7">z</tspan></text>}
      </g>
    </svg>
  )
}
