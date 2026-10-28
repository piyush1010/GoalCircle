'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { CLIP_SECONDS, clipOf } from '@/components/MusicPicker'

interface PostMusicProps {
  postId: string
  title: string
  artist: string
  artworkUrl: string | null
  previewUrl: string
}

export default function PostMusic({ postId, title, artist, artworkUrl, previewUrl }: PostMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  // Plays only the part the person chose (older posts play from the start).
  const clip = clipOf(previewUrl)
  const clipEnd = clip.end ?? (clip.start ? clip.start + CLIP_SECONDS : null)

  useEffect(() => {
    const pauseOtherPosts = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== postId) {
        audioRef.current?.pause()
        setPlaying(false)
      }
    }
    window.addEventListener('goalcircle:music-play', pauseOtherPosts)
    return () => window.removeEventListener('goalcircle:music-play', pauseOtherPosts)
  }, [postId])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    window.dispatchEvent(new CustomEvent('goalcircle:music-play', { detail: postId }))
    if (audio.currentTime < clip.start || (clipEnd !== null && audio.currentTime >= clipEnd)) audio.currentTime = clip.start
    try {
      await audio.play()
      if (audio.currentTime < clip.start) audio.currentTime = clip.start
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (audioRef.current) audioRef.current.muted = next
  }

  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-slate-950 px-2.5 py-2 text-white">
      {artworkUrl ? <Image src={artworkUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><Music2 className="h-4 w-4" /></span>}
      <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{title}</p><p className="truncate text-[11px] text-slate-400">{artist}</p></div>
      <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute music' : 'Mute music'} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
      <button type="button" onClick={() => void togglePlay()} aria-label={playing ? 'Pause music' : 'Play music'} className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-slate-950">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
      <audio ref={audioRef} src={clip.base} preload="none" onEnded={() => setPlaying(false)} onTimeUpdate={(event) => {
        const audio = event.currentTarget
        if (clipEnd !== null && audio.currentTime >= clipEnd) { audio.pause(); audio.currentTime = clip.start; setPlaying(false) }
      }} />
    </div>
  )
}
