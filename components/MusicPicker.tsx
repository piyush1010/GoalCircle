'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Check, Music2, Pause, Play, Search, X } from 'lucide-react'

export interface SelectedTrack {
  id: string
  title: string
  artist: string
  artworkUrl: string
  previewUrl: string
  source: 'iTunes'
}

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
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="music-picker-title">
      <div className="max-h-[82vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#101b2d] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div><h2 id="music-picker-title" className="text-base font-black">Add music</h2><p className="text-[10px] text-slate-500">Search and preview available tracks</p></div>
          <button type="button" onClick={close} aria-label="Close music search" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-[#07101f]"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) setResults([]) }} placeholder="Search songs or artists" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
          <div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto">
            {query.trim().length < 2 && <div className="py-12 text-center"><Music2 className="mx-auto h-7 w-7 text-amber-500" /><p className="mt-2 text-xs font-bold">Find a soundtrack for your goal</p></div>}
            {searching && <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && <p className="py-10 text-center text-xs text-slate-500">No previewable tracks found.</p>}
            {!searching && results.map((track) => <div key={track.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <Image src={track.artworkUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" />
              <button type="button" onClick={() => onSelect(track)} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-black">{track.title}</span><span className="block truncate text-[10px] text-slate-500">{track.artist}</span></button>
              <button type="button" onClick={() => void togglePreview(track)} aria-label={`${playingId === track.id ? 'Pause' : 'Preview'} ${track.title}`} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-slate-700">{playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              <button type="button" onClick={() => { onSelect(track); close() }} aria-label={`Select ${track.title}`} className={`grid h-9 w-9 place-items-center rounded-full ${selected?.id === track.id ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'}`}><Check className="h-4 w-4" /></button>
            </div>)}
          </div>
          <p className="mt-3 text-center text-[9px] text-slate-400">Music search and previews provided by iTunes.</p>
        </div>
      </div>
    </div>
  )
}
