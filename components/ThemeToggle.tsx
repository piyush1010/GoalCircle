'use client'

import { useSyncExternalStore } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

const subscribe = () => () => {}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  if (!mounted) {
    return <div className="w-24 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
          theme === 'dark'
            ? 'bg-slate-900 text-amber-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title="System Preference"
      >
        <Monitor size={16} />
      </button>
    </div>
  )
}
