export interface HabitLogHistory {
  dayOfWeek: number // 0-6
  completed: boolean
}

export function generateSmartNudge(habitTitle: string, history: HabitLogHistory[]): string {
  const missedDays = history.filter(h => !h.completed)

  if (missedDays.length === 0) {
    return `You're building strong momentum with "${habitTitle}". Keep it going today.`
  }

  const dayCounts: Record<number, number> = {}
  missedDays.forEach(h => {
    dayCounts[h.dayOfWeek] = (dayCounts[h.dayOfWeek] || 0) + 1
  })

  let mostMissedDay = 0
  let maxMisses = 0
  Object.entries(dayCounts).forEach(([day, count]) => {
    if (count > maxMisses) {
      maxMisses = count
      mostMissedDay = Number(day)
    }
  })

  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  
  if (maxMisses > 1) {
    return `You often skip "${habitTitle}" on ${days[mostMissedDay]}. Try setting your reminder 15 minutes earlier today.`
  }

  return `Set aside time for "${habitTitle}" today to protect your streak.`
}
