'use client'

import React, { useState, useEffect } from 'react'
import GoalPostModal, { CheckInPayload } from '@/components/GoalPostModal'

export default function HomeFeed() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [posts, setPosts] = useState<CheckInPayload[]>([])

  // Load existing posts on mount
  useEffect(() => {
    const saved = localStorage.getItem('goalcircle_posts')
    if (saved) {
      try {
        setPosts(JSON.parse(saved))
      } catch (err) {
        console.error('Failed to parse saved posts', err)
      }
    }
  }, [])

  const handleNewCheckIn = (newPost: CheckInPayload) => {
    setPosts((prevPosts) => {
      const updated = [newPost, ...prevPosts]
      localStorage.setItem('goalcircle_posts', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-xl mx-auto pb-24">
      {/* HEADER */}
      <header className="flex items-center justify-between py-4 border-b border-slate-800 mb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <span>⭕</span> GoalCircle
          </h1>
          <p className="text-xs text-slate-400">Activity Feed</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20"
        >
          + Log Progress
        </button>
      </header>

      {/* FEED */}
      <main className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl p-8 bg-slate-900/40">
            <p className="text-sm font-bold text-slate-300">No posts in feed yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Click below to record your check-in!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-800 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold"
            >
              Start First Check-In
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {post.goalTitle}
                </span>
                <span className="text-[10px] text-slate-500">{post.createdAt}</span>
              </div>

              {post.notes && (
                <p className="text-xs text-slate-200 font-medium">{post.notes}</p>
              )}

              {/* RENDERED IMAGE PROOF */}
              {post.mediaPreview && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-64 w-full relative">
                  <img
                    src={post.mediaPreview}
                    alt="Check-in proof"
                    style={{
                      objectFit: post.fitMode,
                      objectPosition: post.fitMode === 'cover' ? `center ${post.verticalPosY}%` : 'center',
                      transform: post.fitMode === 'cover' ? `scale(${post.zoomLevel / 100})` : 'none',
                    }}
                    className="w-full h-full transition-all"
                  />
                </div>
              )}
            </article>
          ))
        )}
      </main>

      <GoalPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={handleNewCheckIn}
      />
    </div>
  )
}