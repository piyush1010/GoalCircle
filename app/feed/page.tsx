'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeProvider'

export interface Comment {
  id: string
  userName: string
  text: string
  createdAt: string
}

export interface PostItem {
  id: string
  userName: string
  userHandle: string
  userAvatar: string
  badgeText: string
  goalTitle: string
  notes: string
  visibility: 'public' | 'private'
  mediaPreview: string | null
  mediaType: 'image' | 'video' | null
  selectedTrack?: {
    title: string
    artist: string
    artworkUrl: string
    source: string
    audioUrl?: string
  } | null
  createdAt: string
  boostsCount: number
  isBoosted?: boolean
  commentsCount: number
  timeLogged: number
  streakDays: number
  isCircleMember: boolean
  comments: Comment[]
}

const DEFAULT_AVATAR_1 = 'https://api.dicebear.com/9.x/shapes/svg?seed=Aarav&backgroundColor=f59e0b'
const DEFAULT_AVATAR_2 = 'https://api.dicebear.com/9.x/shapes/svg?seed=Ananya&backgroundColor=10b981'

const INITIAL_POSTS: PostItem[] = [
  {
    id: 'post-init-1',
    userName: 'Aarav Sharma',
    userHandle: '@aarav_s',
    userAvatar: DEFAULT_AVATAR_1,
    badgeText: 'Learning',
    goalTitle: 'Read 30 Pages Daily',
    notes: 'Finished Chapter 4 before sunrise. Consistency over intensity!',
    visibility: 'public',
    mediaPreview: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    selectedTrack: {
      title: 'Quiet Focus Ambient',
      artist: 'Study Playlist',
      artworkUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&q=80',
      source: 'Spotify',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    createdAt: '21m ago',
    boostsCount: 84,
    isBoosted: false,
    commentsCount: 2,
    timeLogged: 45,
    streakDays: 7,
    isCircleMember: true,
    comments: [
      { id: 'c1', userName: 'Alex Chen', text: 'Great progress man! Keep it up.', createdAt: '15m ago' },
      { id: 'c2', userName: 'Priya Verma', text: 'Which chapter was this?', createdAt: '5m ago' }
    ],
  },
  {
    id: 'post-init-2',
    userName: 'Ananya Roy',
    userHandle: '@ananya_r',
    userAvatar: DEFAULT_AVATAR_2,
    badgeText: 'Fitness',
    goalTitle: 'Morning 5km Run',
    notes: 'Beating the heat with an early morning sprint!',
    visibility: 'public',
    mediaPreview: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    selectedTrack: {
      title: 'Upbeat Cardio Beats',
      artist: 'Workout Mix',
      artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=100&q=80',
      source: 'Spotify',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    createdAt: '4h ago',
    boostsCount: 32,
    isBoosted: false,
    commentsCount: 0,
    timeLogged: 30,
    streakDays: 14,
    isCircleMember: false,
    comments: [],
  },
]

export default function FeedPage() {
  const { theme, setTheme } = useTheme()
  const [posts, setPosts] = useState<PostItem[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'circles'>('all')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [openCommentId, setOpenCommentId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Profile Preview Modal
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ userName: string; userHandle: string; userAvatar: string } | null>(null)

  // Post Creation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newBadgeText, setNewBadgeText] = useState('Learning')
  const [newMediaPreview, setNewMediaPreview] = useState('')
  const [newTimeLogged, setNewTimeLogged] = useState('30')

  // Story Reel Modal
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})

  // Load Saved Posts
  useEffect(() => {
    const saved = localStorage.getItem('goalcircle_posts')
    if (saved) {
      try {
        setPosts(JSON.parse(saved))
      } catch (e) {
        setPosts(INITIAL_POSTS)
      }
    } else {
      setPosts(INITIAL_POSTS)
      localStorage.setItem('goalcircle_posts', JSON.stringify(INITIAL_POSTS))
    }
  }, [])

  const savePosts = (updatedPosts: PostItem[]) => {
    setPosts(updatedPosts)
    localStorage.setItem('goalcircle_posts', JSON.stringify(updatedPosts))
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }

  const toggleBoost = (id: string) => {
    const updated = posts.map((post) => {
      if (post.id === id) {
        const isBoosted = !post.isBoosted
        const currentCount = post.boostsCount || 0
        if (isBoosted) showToast('⚡ Boosted!')
        return {
          ...post,
          isBoosted,
          boostsCount: isBoosted ? currentCount + 1 : Math.max(0, currentCount - 1),
        }
      }
      return post
    })
    savePosts(updated)
  }

  const toggleAudio = (postId: string) => {
    const audioEl = audioRefs.current[postId]
    if (!audioEl) return

    if (playingTrackId === postId) {
      audioEl.pause()
      setPlayingTrackId(null)
    } else {
      Object.keys(audioRefs.current).forEach((key) => {
        if (audioRefs.current[key] && key !== postId) {
          audioRefs.current[key]?.pause()
        }
      })
      audioEl.currentTime = 0
      audioEl.play().then(() => setPlayingTrackId(postId)).catch(() => {})
    }
  }

  const handlePostComment = (postId: string) => {
    if (!newCommentText.trim()) return

    const updated = posts.map((post) => {
      if (post.id === postId) {
        const newComment: Comment = {
          id: `c-${Date.now()}`,
          userName: 'You',
          text: newCommentText.trim(),
          createdAt: 'Just now',
        }
        return {
          ...post,
          comments: [...post.comments, newComment],
          commentsCount: post.commentsCount + 1,
        }
      }
      return post
    })

    savePosts(updated)
    setNewCommentText('')
    showToast('💬 Comment added!')
  }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalTitle.trim()) return

    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      userName: 'Piyush Kaushik',
      userHandle: '@piyushkaushik10',
      userAvatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=PiyushKaushik&backgroundColor=f59e0b',
      badgeText: newBadgeText,
      goalTitle: newGoalTitle,
      notes: newNotes,
      visibility: 'public',
      mediaPreview: newMediaPreview.trim() || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      mediaType: 'image',
      selectedTrack: {
        title: 'Deep Work Flow',
        artist: 'GoalCircle Radio',
        artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=100&q=80',
        source: 'Spotify',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
      },
      createdAt: 'Just now',
      boostsCount: 0,
      isBoosted: false,
      commentsCount: 0,
      timeLogged: parseInt(newTimeLogged) || 30,
      streakDays: 1,
      isCircleMember: true,
      comments: [],
    }

    savePosts([newPost, ...posts])
    setIsCreateModalOpen(false)
    setNewGoalTitle('')
    setNewNotes('')
    setNewMediaPreview('')
    showToast('🚀 Check-in published!')
  }

  const mediaPosts = posts.filter((p) => p.mediaPreview)
  const displayedPosts = activeTab === 'circles' ? posts.filter((p) => p.isCircleMember) : posts

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 pb-28 transition-colors duration-200 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-lg animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b0f17]/90 px-4 py-3 max-w-md mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold text-base">⚡</span>
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Feed</h1>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Community Accountability & Progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Header Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full border text-xs font-bold transition bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-400"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Story Reel Launcher */}
          <button
            onClick={() => {
              if (mediaPosts.length > 0) {
                setCurrentStoryIndex(0)
                setIsStoryModalOpen(true)
              }
            }}
            className="p-2 rounded-full border text-xs transition bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            title="Watch Stories"
          >
            🎬
          </button>

          {/* Live Updates Badge */}
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Live Updates
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-3 pt-3 space-y-4">
        {/* Segmented Feed Filter Tabs */}
        <div className="p-1 rounded-2xl flex border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
          >
            All Updates
          </button>
          <button
            onClick={() => setActiveTab('circles')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'circles' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <span>My Circles</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full font-extrabold">👥</span>
          </button>
        </div>

        {/* Post Cards List */}
        {displayedPosts.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <span className="text-3xl block mb-2">🎯</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">No updates in this view.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Be the first to share your progress today!</p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl p-4 border transition-all bg-white dark:bg-[#161e2e] border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-md space-y-3.5"
            >
              {/* User Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => setSelectedUserProfile({ userName: post.userName, userHandle: post.userHandle, userAvatar: post.userAvatar })}
                >
                  <img
                    src={post.userAvatar}
                    alt={post.userName}
                    className="w-10 h-10 rounded-full object-cover border border-amber-500/30 group-hover:scale-105 transition"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName)}&background=f59e0b&color=fff`
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition">{post.userName}</h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{post.userHandle}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-md">
                        {post.badgeText}
                      </span>
                      <span className="text-[10px] font-medium text-amber-500">⚡ {post.streakDays}d streak</span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{post.createdAt}</span>
              </div>

              {/* Goal Title Bar */}
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-amber-500">🎯</span> Goal: {post.goalTitle}
                </span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  ✓ {post.timeLogged} mins logged
                </span>
              </div>

              {/* Caption */}
              {post.notes && <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">{post.notes}</p>}

              {/* Media Container with Attached Audio Overlay */}
              {post.mediaPreview && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black relative h-72">
                  <img src={post.mediaPreview} alt="Check-in proof" className="w-full h-full object-cover" />

                  {post.selectedTrack && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl flex items-center justify-between shadow-lg">
                      {post.selectedTrack.audioUrl && (
                        <audio
                          ref={(el) => { audioRefs.current[post.id] = el }}
                          src={post.selectedTrack.audioUrl}
                          preload="none"
                          onEnded={() => setPlayingTrackId(null)}
                        />
                      )}
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={post.selectedTrack.artworkUrl} alt={post.selectedTrack.title} className="w-7 h-7 rounded-lg object-cover" />
                        <div className="truncate">
                          <p className="text-[11px] font-bold text-white truncate">{post.selectedTrack.title}</p>
                          <p className="text-[9px] text-slate-400 truncate">{post.selectedTrack.artist}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAudio(post.id)}
                        className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs hover:scale-105 transition"
                      >
                        {playingTrackId === post.id ? '⏸' : '▶'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => toggleBoost(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition ${post.isBoosted ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <span>⚡</span>
                  <span>Boost ({post.boostsCount})</span>
                </button>

                <button
                  onClick={() => setOpenCommentId(openCommentId === post.id ? null : post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition ${openCommentId === post.id ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <span>💬</span>
                  <span>Comment ({post.commentsCount})</span>
                </button>
              </div>

              {/* Inline Comments Section */}
              {openCommentId === post.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {post.comments.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic text-center">Be the first to comment!</p>
                    ) : (
                      post.comments.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[10px] text-slate-900 dark:text-white">{c.userName}</span>
                            <span className="text-[9px] text-slate-500">{c.createdAt}</span>
                          </div>
                          <p className="text-[11px] text-slate-800 dark:text-slate-200">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                      placeholder="Add an encouraging comment..."
                      className="flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={() => handlePostComment(post.id)}
                      className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs hover:bg-amber-400 transition"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </main>

      {/* User Profile Modal */}
      {selectedUserProfile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl p-5 border text-center relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <button onClick={() => setSelectedUserProfile(null)} className="absolute top-3 right-4 text-slate-400 text-sm">✕</button>
            <img src={selectedUserProfile.userAvatar} alt="Profile" className="w-16 h-16 rounded-full mx-auto border-2 border-amber-500 mb-2" />
            <h2 className="font-black text-sm text-slate-900 dark:text-white">{selectedUserProfile.userName}</h2>
            <p className="text-xs text-slate-500 mb-4">{selectedUserProfile.userHandle}</p>
            <button onClick={() => setSelectedUserProfile(null)} className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded-xl text-xs">
              View Full Profile
            </button>
          </div>
        </div>
      )}

      {/* Create Check-in Modal (`+` Button) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-5 border relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 text-sm">✕</button>
            <h2 className="font-black text-base mb-3">🎯 New Check-in</h2>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Read 30 Pages Daily"
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold block mb-1">Category</label>
                  <select
                    value={newBadgeText}
                    onChange={(e) => setNewBadgeText(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <option value="Learning">Learning</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Mindfulness">Mindfulness</option>
                  </select>
                </div>

                <div className="w-1/3">
                  <label className="text-[11px] font-bold block mb-1">Mins Logged</label>
                  <input
                    type="number"
                    value={newTimeLogged}
                    onChange={(e) => setNewTimeLogged(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">Photo Preview URL (Optional)</label>
                <input
                  type="text"
                  value={newMediaPreview}
                  onChange={(e) => setNewMediaPreview(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">Notes / Reflection</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Share your breakthrough today..."
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-xs mt-2 hover:bg-amber-400 transition">
                Publish Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Story Reel Modal */}
      {isStoryModalOpen && mediaPosts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 max-w-md mx-auto my-auto h-full sm:h-[90vh] sm:rounded-3xl border border-slate-800 overflow-hidden">
          <div className="flex justify-between items-center z-10 pt-2">
            <div className="flex items-center gap-2">
              <img src={mediaPosts[currentStoryIndex].userAvatar} alt="Story User" className="w-8 h-8 rounded-full border border-white/20" />
              <div>
                <p className="text-xs font-bold text-white">{mediaPosts[currentStoryIndex].userName}</p>
                <p className="text-[10px] text-slate-300">{mediaPosts[currentStoryIndex].goalTitle}</p>
              </div>
            </div>
            <button onClick={() => setIsStoryModalOpen(false)} className="text-white text-sm bg-white/10 w-8 h-8 rounded-full">✕</button>
          </div>

          <div className="relative flex-1 my-3 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
            <img src={mediaPosts[currentStoryIndex].mediaPreview!} alt="Story" className="w-full h-full object-cover" />
          </div>

          <div className="z-10 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-200">{mediaPosts[currentStoryIndex].notes}</p>
          </div>
        </div>
      )}

      {/* Bottom Floating Post Launcher */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-12 h-12 bg-amber-500 text-slate-950 font-black rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-slate-900 hover:scale-105 active:scale-95 transition"
          title="Create New Post"
        >
          +
        </button>
      </div>
    </div>
  )
}