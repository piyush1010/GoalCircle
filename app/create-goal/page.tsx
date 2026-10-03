'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

const MOCK_TRACKS = [
  { id: '1', title: 'Roar', artist: 'Katy Perry', art: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&q=80' },
  { id: '2', title: "I Can't Handle Change", artist: 'Roar', art: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=100&q=80' },
  { id: '3', title: 'Roar', artist: 'KIDZ BOP Kids', art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=100&q=80' },
  { id: '4', title: 'ROAR', artist: 'sfd', art: 'https://images.unsplash.com/photo-1493225457124-a1a2a5956093?auto=format&fit=crop&w=100&q=80' },
]

export default function CreateGoalPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Form State
  const [goalTitle, setGoalTitle] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [selectedTrack, setSelectedTrack] = useState<string | null>('1') // Default to first track to match your screenshot
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null)
  const [deadlineDate, setDeadlineDate] = useState('2026-11-02') // Default from your screenshot
  
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [mediaFileName, setMediaFileName] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaFileName(file.name)
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setMediaType(type)
    
    const objectUrl = URL.createObjectURL(file)
    setMediaPreview(objectUrl)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For this prototype, we'll allow submission even without a title to prevent blocks,
    // but default it to something if empty
    const finalTitle = goalTitle.trim() || 'New Goal'
    
    setIsSubmitting(true)

    try {
      const trackData = selectedTrack ? MOCK_TRACKS.find(t => t.id === selectedTrack) : null

      const newPost = {
        id: `post-${Date.now()}`,
        userName: 'You',
        userHandle: '@you',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        badgeText: 'New Goal',
        goalTitle: finalTitle,
        notes: '',
        visibility: visibility as 'public' | 'private',
        mediaPreview: mediaPreview,
        mediaType: mediaType,
        selectedTrack: trackData ? {
          title: trackData.title,
          artist: trackData.artist,
          artworkUrl: trackData.art,
          source: 'Spotify'
        } : null,
        createdAt: 'Just now',
        boostsCount: 0,
        isBoosted: false,
        commentsCount: 0,
      }

      const saved = localStorage.getItem('goalcircle_posts')
      const existingPosts = saved ? JSON.parse(saved) : []
      const updatedPosts = [newPost, ...existingPosts]
      
      localStorage.setItem('goalcircle_posts', JSON.stringify(updatedPosts))
      router.push('/feed')
    } catch (error) {
      console.error("Save failed:", error)
      alert("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-1">
              ← Edit
            </button>
            <h1 className="text-base font-black tracking-tight text-slate-900">Preview Post</h1>
          </div>
        </header>
        <main className="max-w-xl mx-auto px-4 pt-6 space-y-4">
          <article className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3 pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80" alt="You" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black text-slate-900">You</h3>
                    <span className="text-[10px] text-slate-400">@you</span>
                  </div>
                  <p className="text-[10px] font-medium text-amber-600">New Goal</p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Just now</span>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-2xl">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="text-amber-500">🎯</span> Goal: {goalTitle || 'Untitled Goal'}
              </span>
            </div>

            {mediaPreview && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 relative h-72">
                {mediaType === 'video' ? (
                  <video src={mediaPreview} className="w-full h-full object-contain" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                )}
                
                {selectedTrack && (
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg max-w-[85%]">
                    <img src={MOCK_TRACKS.find(t => t.id === selectedTrack)?.art} className="w-6 h-6 rounded-lg object-cover" alt="art" />
                    <p className="text-[11px] font-bold text-white truncate">
                      {MOCK_TRACKS.find(t => t.id === selectedTrack)?.title}
                    </p>
                  </div>
                )}
              </div>
            )}
          </article>
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition disabled:opacity-50 mt-4">
            {isSubmitting ? 'Declaring...' : 'Declare Goal Now'}
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 max-w-xl mx-auto flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 font-medium text-sm flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-sm font-bold text-slate-900">Create Goal</h1>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Goal Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GOAL TITLE</label>
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="e.g. Read 30 pages daily"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VISIBILITY</label>
            <div className="relative">
              <select 
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="public">🌍 Public GoalCircle Stream (Everyone)</option>
                <option value="private">🔒 Private</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Background Track */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                🎵 BACKGROUND TRACK
              </label>
              <button type="button" onClick={() => setSelectedTrack(null)} className="text-[10px] font-bold text-red-400">Clear Selected</button>
            </div>
            
            <div className="relative mb-2">
              <input type="text" placeholder="Search any song or artist..." className="w-full bg-slate-100 border-none rounded-lg px-3 py-2 text-xs focus:outline-none" />
              <button type="button" className="absolute right-2 top-1.5 text-xs font-bold text-slate-600">Search</button>
            </div>

            <div className="space-y-1">
              {MOCK_TRACKS.map(track => (
                <div key={track.id} onClick={() => setSelectedTrack(track.id)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${selectedTrack === track.id ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <img src={track.art} alt={track.title} className="w-8 h-8 rounded object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{track.title}</p>
                      <p className="text-[10px] text-slate-500">{track.artist}</p>
                    </div>
                  </div>
                  {selectedTrack === track.id ? (
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-1 rounded-md">Selected ✓</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Select</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Target Deadline */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                📅 TARGET DEADLINE
              </label>
              <button type="button" onClick={() => setDeadlineDays(null)} className="text-[10px] font-bold text-red-400">Clear</button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button type="button" onClick={() => setDeadlineDays(7)} className={`py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 border ${deadlineDays === 7 ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 bg-white'}`}>
                ✨ 7 Days
              </button>
              <button type="button" onClick={() => setDeadlineDays(30)} className={`py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 border ${deadlineDays === 30 ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 bg-white'}`}>
                🔥 30 Days
              </button>
              <button type="button" onClick={() => setDeadlineDays(90)} className={`py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 border ${deadlineDays === 90 ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 bg-white'}`}>
                🎯 90 Days
              </button>
            </div>
            
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Attach Media */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              🖼️ ATTACH IMAGES OR VIDEO SHORTS
            </label>
            <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Choose files</span>
                <span className="text-xs text-slate-500">{mediaFileName || 'No file chosen'}</span>
              </div>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" id="media-upload" />
              <label htmlFor="media-upload" className="cursor-pointer text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200">
                Browse
              </label>
            </div>
            {mediaPreview && <p className="text-[10px] text-emerald-500 font-bold ml-1">1 file(s) selected</p>}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm bg-white shadow-sm hover:bg-slate-50 transition"
            >
              Preview Post
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'DECLARING GOAL...' : 'DECLARE GOAL'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}