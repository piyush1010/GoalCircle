'use client'

import React, { useState } from 'react'

interface NotificationItem {
  id: string
  title: string
  description: string
  timestamp: string
  isRead: boolean
  icon: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Streak Milestone!',
      description: 'You reached a 5-day streak on "read 20 pages daily". Keep going!',
      timestamp: '2h ago',
      isRead: false,
      icon: '🔥',
    },
    {
      id: '2',
      title: 'New Like',
      description: 'Aarav Sharma liked your recent goal update.',
      timestamp: '4h ago',
      isRead: false,
      icon: '❤️',
    },
    {
      id: '3',
      title: 'Circle Update',
      description: 'New activity in "5 AM Club" accountability circle.',
      timestamp: '1d ago',
      isRead: true,
      icon: '👥',
    },
  ])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-5 pb-28 text-slate-800 dark:text-slate-200 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            🔔 Notifications
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Stay updated on your goals and circles
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="text-xs font-bold text-amber-500 hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`border rounded-2xl p-4 shadow-sm flex items-start gap-3 transition ${
              item.isRead
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="text-xl shrink-0 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {item.icon}
            </div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}