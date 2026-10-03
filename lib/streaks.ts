export interface HabitLog {
  completed_at: string // YYYY-MM-DD
}

export function calculateStreaks(logs: HabitLog[]) {
  if (!logs.length) return { currentStreak: 0, longestStreak: 0 }

  const sortedDates = Array.from(new Set(logs.map(l => l.completed_at)))
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  // Check if active today or yesterday
  const mostRecent = sortedDates[0]
  mostRecent.setHours(0, 0, 0, 0)
  
  const isActive = mostRecent.getTime() === today.getTime() || mostRecent.getTime() === yesterday.getTime()

  let expectedDate = new Date(mostRecent)

  for (const date of sortedDates) {
    date.setHours(0, 0, 0, 0)
    const diffDays = Math.round((expectedDate.getTime() - date.getTime()) / (1000 * 3600 * 24))

    if (diffDays === 0) {
      tempStreak++
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else if (diffDays === 1) {
      tempStreak++
      expectedDate = new Date(date)
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      break
    }
  }

  if (isActive) currentStreak = tempStreak
  longestStreak = Math.max(currentStreak, tempStreak)

  return { currentStreak, longestStreak }
}