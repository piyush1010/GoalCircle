'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Music2, Pause, Play, Search, Scissors, X } from 'lucide-react'

export interface SelectedTrack {
  id: string
  title: string
  artist: string
  artworkUrl: string
  previewUrl: string
  source: 'iTunes'
}

/** How long the chosen part of a song is (like a reel's sound). */
export const CLIP_SECONDS = 15

/**
 * The chosen part is stored in the preview link itself as a media fragment ("…#t=12,27"),
 * which browsers understand, so nothing extra has to be saved in the database.
 */
export function clipOf(url: string) {
  const [base, fragment] = url.split('#')
  const match = /t=([\d.]+)(?:,([\d.]+))?/.exec(fragment || '')
  const start = match ? Number(match[1]) : 0
  const end = match?.[2] ? Number(match[2]) : null
  return { base, start, end }
}

function withClip(url: string, start: number) {
  const { base } = clipOf(url)
  const from = Math.max(0, Math.round(start))
  return from > 0 ? `${base}#t=${from},${from + CLIP_SECONDS}` : `${base}#t=0,${CLIP_SECONDS}`
}

const clock = (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, '0')}`

interface ITunesTrack {
  trackId: number
  trackName: string
  artistName: string
  artworkUrl100?: string
  previewUrl?: string
}

interface MusicPickerProps {
  open: boolean
  selected: SelectedTrack | null
  onClose: () => void
  onSelect: (track: SelectedTrack | null) => void
}

export default function MusicPicker({ open, selected, onClose, onSelect }: MusicPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SelectedTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Second step: choose which part of the song plays.
  const [cropping, setCropping] = useState<SelectedTrack | null>(null)
  const [start, setStart] = useState(0)
  const [length, setLength] = useState(30)
  const [position, setPosition] = useState<number | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      // Reopening with a song already chosen goes straight to picking its part.
      setCropping(selected)
      setStart(selected ? clipOf(selected.previewUrl).start : 0)
      setPosition(null)
    }
  }

  useEffect(() => {
    if (!open || query.trim().length < 2) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&entity=song&limit=8`, { signal: controller.signal })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json() as { results?: ITunesTrack[] }
        setResults((data.results || []).filter((track) => track.previewUrl).map((track) => ({
          id: `itunes-${track.trackId}`,
          title: track.trackName,
          artist: track.artistName,
          artworkUrl: (track.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
          previewUrl: track.previewUrl as string,
          source: 'iTunes',
        })))
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  useEffect(() => () => audioRef.current?.pause(), [])

  if (!open) return null

  const stopAudio = () => {
    audioRef.current?.pause()
    setPlayingId(null)
    setPosition(null)
  }

  const beginCrop = (track: SelectedTrack) => {
    stopAudio()
    setCropping(track)
    setStart(selected?.id === track.id ? clipOf(selected.previewUrl).start : 0)
  }

  // Plays the chosen part on a loop so it's easy to hear while dragging.
  const playPart = async (from = start) => {
    if (!cropping) return
    audioRef.current?.pause()
    const audio = new Audio(clipOf(cropping.previewUrl).base)
    audioRef.current = audio
    audio.onloadedmetadata = () => { if (Number.isFinite(audio.duration) && audio.duration > CLIP_SECONDS) setLength(audio.duration) }
    audio.ontimeupdate = () => {
      setPosition(audio.currentTime)
      const end = Number(audio.dataset.start || 0) + CLIP_SECONDS
      if (audio.currentTime >= end) audio.currentTime = Number(audio.dataset.start || 0)
    }
    audio.onended = () => { audio.currentTime = Number(audio.dataset.start || 0); void audio.play().catch(() => undefined) }
    audio.dataset.start = String(from)
    audio.currentTime = from
    setPlayingId(cropping.id)
    try {
      await audio.play()
      audio.currentTime = from
    } catch {
      setPlayingId(null)
    }
  }

  const moveStart = (value: number) => {
    setStart(value)
    const audio = audioRef.current
    if (audio && playingId === cropping?.id) {
      audio.dataset.start = String(value)
      audio.currentTime = value
    }
  }

  const useThisPart = () => {
    if (!cropping) return
    onSelect({ ...cropping, previewUrl: withClip(cropping.previewUrl, start) })
    close()
  }

  const togglePreview = async (track: SelectedTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(track.previewUrl)
    audioRef.current = audio
    audio.onended = () => setPlayingId(null)
    setPlayingId(track.id)
    try {
      await audio.play()
    } catch {
      setPlayingId(null)
    }
  }

  const close = () => {
    audioRef.current?.pause()
    setPlayingId(null)
    setPosition(null)
    onClose()
  }

  const maxStart = Math.max(0, Math.floor(length - CLIP_SECONDS))
  const safeStart = Math.min(start, maxStart)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="music-picker-title">
      <div className="max-h-[82vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#16181B] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">{cropping && <button type="button" onClick={() => { stopAudio(); setCropping(null) }} aria-label="Change song" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><ArrowLeft className="h-4 w-4" /></button>}<div><h2 id="music-picker-title" className="text-base font-bold">{cropping ? 'Pick the part' : 'Add music'}</h2><p className="text-xs text-slate-500">{cropping ? `Slide to choose ${CLIP_SECONDS} seconds` : 'Search and preview available tracks'}</p></div></div>
          <button type="button" onClick={close} aria-label="Close music search" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        {cropping ? <div className="p-5">
          <div className="flex items-center gap-3">
            <Image src={cropping.artworkUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{cropping.title}</p><p className="truncate text-xs text-slate-500">{cropping.artist}</p></div>
            <button type="button" onClick={() => playingId === cropping.id ? stopAudio() : void playPart(safeStart)} aria-label={playingId === cropping.id ? 'Pause' : 'Play this part'} className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900">{playingId === cropping.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
          </div>

          <div className="relative mt-6 h-14">
            {/* Song bars, with the chosen part lit up */}
            <div className="absolute inset-0 flex items-center gap-[3px]" aria-hidden="true">
              {Array.from({ length: 40 }, (_, index) => {
                const at = (index + 0.5) * (length / 40)
                const inside = at >= safeStart && at <= safeStart + CLIP_SECONDS
                const heard = position !== null && inside && at <= position
                const height = 30 + Math.abs(Math.sin(index * 1.7) * 55) + (index % 3) * 5
                return <span key={index} className={`flex-1 rounded-full ${heard ? 'bg-orange-500' : inside ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: `${Math.min(100, height)}%` }} />
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-[-4px] rounded-xl border-2 border-amber-500" style={{ left: `${(safeStart / length) * 100}%`, width: `${(CLIP_SECONDS / length) * 100}%` }} />
            <input type="range" min={0} max={maxStart} step={1} value={safeStart} onChange={(event) => moveStart(Number(event.target.value))} aria-label="Start of the part" className="absolute inset-0 h-full w-full cursor-grab opacity-0" />
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>{clock(safeStart)}</span><span className="text-amber-600 dark:text-amber-400"><Scissors className="mr-1 inline h-3.5 w-3.5" />{CLIP_SECONDS} sec</span><span>{clock(safeStart + CLIP_SECONDS)}</span></div>

          <button type="button" onClick={useThisPart} className="mt-6 w-full rounded-xl bg-slate-900 dark:bg-slate-50 py-3.5 text-sm font-bold text-white dark:text-slate-900">Use this part</button>
          {selected?.id === cropping.id && <button type="button" onClick={() => { onSelect(null); close() }} className="mt-2 w-full py-2 text-xs font-bold text-slate-500">Remove music</button>}
        </div> : <div className="p-4">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-[#0E0F11]"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) setResults([]) }} placeholder="Search songs or artists" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
          <div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto">
            {query.trim().length < 2 && <div className="py-12 text-center"><Music2 className="mx-auto h-7 w-7 text-amber-500" /><p className="mt-2 text-xs font-bold">Find a soundtrack for your goal</p></div>}
            {searching && <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && <p className="py-10 text-center text-xs text-slate-500">No previewable tracks found.</p>}
            {!searching && results.map((track) => <div key={track.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <Image src={track.artworkUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" />
              <button type="button" onClick={() => beginCrop(track)} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-bold">{track.title}</span><span className="block truncate text-xs text-slate-500">{track.artist}</span></button>
              <button type="button" onClick={() => void togglePreview(track)} aria-label={`${playingId === track.id ? 'Pause' : 'Preview'} ${track.title}`} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-slate-700">{playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              <button type="button" onClick={() => beginCrop(track)} aria-label={`Select ${track.title}`} className={`grid h-9 w-9 place-items-center rounded-full ${selected?.id === track.id ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900'}`}><Check className="h-4 w-4" /></button>
            </div>)}
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">Music search and previews provided by iTunes.</p>
        </div>}
      </div>
    </div>
  )
}
