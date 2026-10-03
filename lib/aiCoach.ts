export interface HabitLogHistory {
  dayOfWeek: number // 0-6
  completed: boolean
}

export function generateSmartNudge(habitTitle: string, history: HabitLogHistory[]): string {
  const missedDays = history.filter(h => !h.completed)

  if (missedDays.length === 0) {
    return `🔥 You're on a roll with "${habitTitle}"! Keep up the momentum today.`
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
    return `💡 AI Nudge: You often skip "${habitTitle}" on ${days[mostMissedDay]}. Consider setting a 15-minute earlier reminder today!`
  }

  return `🎯 Reminder: Dedicate time to "${habitTitle}" today to protect your streak!`
}