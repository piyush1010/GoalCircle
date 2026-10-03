'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export interface UnifiedTrack {
  id: string
  title: string
  artist: string
  artworkUrl: string
  previewUrl?: string
  source: 'iTunes' | 'Spotify' | 'YouTube'
}

export interface CheckInPayload {
  id: string
  goalTitle: string
  notes: string
  visibility: 'public' | 'private'
  mediaPreview: string | null
  mediaType: 'image' | 'video' | null
  mediaName?: string
  fitMode: 'cover' | 'contain'
  verticalPosY: number
  zoomLevel: number
  selectedTrack: UnifiedTrack | null
  createdAt: string
}

interface GoalPostModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitSuccess?: (data: CheckInPayload) => void
}

export default function GoalPostModal({
  isOpen,
  onClose,
  onSubmitSuccess,
}: GoalPostModalProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>('Deep Work / Coding Session')
  const [customGoalText, setCustomGoalText] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')

  const [notes, setNotes] = useState('')

  const [audioTab, setAudioTab] = useState<'search' | 'upload'>('search')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'itunes' | 'spotify'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnifiedTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<UnifiedTrack | null>(null)
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null)

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover')
  const [verticalPosY, setVerticalPosY] = useState<number>(50)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [cardHeight, setCardHeight] = useState<number>(220)
  const [isPreviewLightBoxOpen, setIsPreviewLightBoxOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!searchQuery.trim() || audioTab !== 'search') {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results: UnifiedTrack[] = []

      try {
        if (sourceFilter === 'all' || sourceFilter === 'itunes') {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=5`
          )
          const itunesData = await itunesRes.json()
          if (itunesData.results) {
            itunesData.results.forEach((item: any) => {
              results.push({
                id: `itunes-${item.trackId}`,
                title: item.trackName,
                artist: item.artistName,
                artworkUrl: item.artworkUrl60 || item.artworkUrl100,
                previewUrl: item.previewUrl,
                source: 'iTunes',
              })
            })
          }
        }

        if (sourceFilter === 'all' || sourceFilter === 'spotify') {
          results.push({
            id: `spotify-${Date.now()}`,
            title: `${searchQuery} (Spotify Track)`,
            artist: 'Popular Artist',
            artworkUrl: 'https://open.spotifycdn.com/cdn/images/favicon32.8e66b08d.png',
            previewUrl: '',
            source: 'Spotify',
          })
        }

        setSearchResults(results)
      } catch (err) {
        console.error('Failed to fetch tracks:', err)
      } finally {
        setIsSearching(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [searchQuery, audioTab, sourceFilter])

  if (!isOpen) return null

  const resetAllFields = () => {
    setSelectedGoal('Deep Work / Coding Session')
    setCustomGoalText('')
    setVisibility('public')
    setNotes('')
    setSearchQuery('')
    setSearchResults([])
    setSelectedTrack(null)
    setUploadedAudio(null)
    setPlayingPreviewUrl(null)
    setMediaFile(null)
    setMediaPreview(null)
    setFitMode('cover')
    setVerticalPosY(50)
    setZoomLevel(100)
    setCardHeight(220)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetAllFields()
    onClose()
  }

  const handleMediaSelect = (file: File) => {
    if (!file) return
    setMediaFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setZoomLevel(100)
    setVerticalPosY(50)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleMediaSelect(e.dataTransfer.files[0])
    }
  }

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedAudio(file)
      setSelectedTrack(null)
    }
  }

  const toggleAudioPreview = (previewUrl?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!previewUrl) return
    setPlayingPreviewUrl((prev) => (prev === previewUrl ? null : previewUrl))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const finalGoal = selectedGoal === 'CUSTOM' ? customGoalText : selectedGoal
    const isVideo = mediaFile?.type.startsWith('video/')

    const checkInPayload: CheckInPayload = {
      id: `post-${Date.now()}`,
      goalTitle: finalGoal || 'Goal Check-In',
      notes,
      visibility,
      mediaPreview,
      mediaType: mediaPreview ? (isVideo ? 'video' : 'image') : null,
      mediaName: mediaFile?.name,
      fitMode,
      verticalPosY,
      zoomLevel,
      selectedTrack,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    if (onSubmitSuccess) {
      onSubmitSuccess(checkInPayload)
    }

    resetAllFields()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Log Progress
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Select Goal
                  </label>
                  <Link
                    href="/create-goal"
                    onClick={handleClose}
                    className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-0.5"
                  >
                    + Create Goal
                  </Link>
                </div>

                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="Read 20 pages daily">📖 Read 20 pages daily</option>
                  <option value="Morning 5km Run">🏃 Morning 5km Run</option>
                  <option value="Deep Work / Coding Session">💻 Deep Work / Coding Session</option>
                  <option value="Competitive Exams Prep">📚 Competitive Exams Prep</option>
                  <option value="Meditation & Mindfulness">🧘 Meditation & Mindfulness</option>
                  <option value="CUSTOM">+ Custom Goal...</option>
                </select>

                {selectedGoal === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter custom goal title..."
                    value={customGoalText}
                    onChange={(e) => setCustomGoalText(e.target.value)}
                    className="mt-2 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {visibility === 'public' ? '🌍 Public Post' : '🔒 Private (Only Me)'}
                </span>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      visibility === 'public'
                        ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      visibility === 'private'
                        ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                Notes & Reflections / Caption
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What milestone did you hit today?"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  🎵 Attach Track
                </span>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAudioTab('search')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      audioTab === 'search'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Stream Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioTab('upload')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      audioTab === 'upload'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {audioTab === 'search' ? (
                <div className="space-y-2 relative">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSourceFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition ${
                        sourceFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceFilter('spotify')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition ${
                        sourceFilter === 'spotify'
                          ? 'bg-emerald-600 text-white border-transparent'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Spotify
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceFilter('itunes')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition ${
                        sourceFilter === 'itunes'
                          ? 'bg-rose-600 text-white border-transparent'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      iTunes / Apple
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search Spotify & Apple Music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />

                  {selectedTrack && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img
                          src={selectedTrack.artworkUrl}
                          alt={selectedTrack.title}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate">
                              {selectedTrack.title}
                            </p>
                            <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {selectedTrack.source}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {selectedTrack.artist}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTrack(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {searchQuery.trim() && !selectedTrack && (
                    <div className="max-h-44 overflow-y-auto space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-lg">
                      {isSearching ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">
                          Searching music platforms...
                        </p>
                      ) : searchResults.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">
                          No tracks found.
                        </p>
                      ) : (
                        searchResults.map((track) => (
                          <div
                            key={track.id}
                            onClick={() => {
                              setSelectedTrack(track)
                              setUploadedAudio(null)
                            }}
                            className="flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img
                                src={track.artworkUrl}
                                alt={track.title}
                                className="w-7 h-7 rounded-md object-cover"
                              />
                              <div className="truncate">
                                <div className="flex items-center gap-1">
                                  <p className="font-bold text-slate-900 dark:text-white text-[11px] truncate">
                                    {track.title}
                                  </p>
                                  <span
                                    className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                                      track.source === 'Spotify'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {track.source}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 truncate">
                                  {track.artist}
                                </p>
                              </div>
                            </div>

                            {track.previewUrl && (
                              <button
                                type="button"
                                onClick={(e) => toggleAudioPreview(track.previewUrl, e)}
                                className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 transition"
                              >
                                {playingPreviewUrl === track.previewUrl ? '⏸ Pause' : '▶ Play'}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {playingPreviewUrl && (
                    <audio
                      src={playingPreviewUrl}
                      autoPlay
                      onEnded={() => setPlayingPreviewUrl(null)}
                      className="hidden"
                    />
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  {uploadedAudio && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      ✓ Attached: {uploadedAudio.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  📷 Attach Photo / Video Proof
                </label>
                {mediaPreview && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFitMode('cover')}
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border transition ${
                        fitMode === 'cover'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitMode('contain')}
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border transition ${
                        fitMode === 'contain'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Fit Whole
                    </button>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0])}
                className="hidden"
              />

              {!mediaPreview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg font-bold">
                    📸
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to upload <span className="text-slate-400 font-normal">or drag & drop</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, MP4, MOV</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    style={{ height: `${cardHeight}px` }}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 group shadow-lg transition-all"
                  >
                    {mediaFile?.type.startsWith('video/') ? (
                      <video src={mediaPreview} controls className="w-full h-full object-contain" />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
                        <img
                          src={mediaPreview}
                          alt="Proof preview"
                          style={{
                            objectFit: fitMode,
                            objectPosition: fitMode === 'cover' ? `center ${verticalPosY}%` : 'center',
                            transform: fitMode === 'cover' ? `scale(${zoomLevel / 100})` : 'none',
                          }}
                          className="w-full h-full transition-transform duration-100 cursor-pointer"
                          onClick={() => setIsPreviewLightBoxOpen(true)}
                        />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 truncate max-w-[60%]">
                        <span>{mediaFile?.type.startsWith('video/') ? '🎥' : '📷'}</span>
                        <span className="truncate">{mediaFile?.name}</span>
                      </span>

                      <div className="flex items-center gap-1 pointer-events-auto">
                        {!mediaFile?.type.startsWith('video/') && (
                          <button
                            type="button"
                            onClick={() => setIsPreviewLightBoxOpen(true)}
                            className="bg-slate-950/80 hover:bg-slate-900 text-white px-2 py-1 rounded-full text-[10px] font-bold transition border border-white/10 flex items-center gap-1"
                          >
                            🔍 Full View
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-slate-950/80 hover:bg-slate-900 text-white p-1.5 rounded-full text-xs transition border border-white/10"
                          title="Change file"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaFile(null)
                            setMediaPreview(null)
                          }}
                          className="bg-rose-600 hover:bg-rose-500 text-white p-1.5 rounded-full text-xs transition shadow-md"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                  {!mediaFile?.type.startsWith('video/') && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase w-20">
                          Frame Height:
                        </span>
                        <input
                          type="range"
                          min="150"
                          max="360"
                          value={cardHeight}
                          onChange={(e) => setCardHeight(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {fitMode === 'cover' && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase w-20">
                              Position Y:
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={verticalPosY}
                              onChange={(e) => setVerticalPosY(Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase w-20">
                              Zoom ({zoomLevel}%):
                            </span>
                            <input
                              type="range"
                              min="100"
                              max="200"
                              value={zoomLevel}
                              onChange={(e) => setZoomLevel(Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all mt-2"
            >
              ✓ Complete Check-In
            </button>
          </form>
        </div>
      </div>

      {isPreviewLightBoxOpen && mediaPreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsPreviewLightBoxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
            <button
              onClick={() => setIsPreviewLightBoxOpen(false)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-slate-800/80 hover:bg-slate-700 px-3 py-1 rounded-full border border-white/20 transition"
            >
              ✕ Close Preview
            </button>
            <img
              src={mediaPreview}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}