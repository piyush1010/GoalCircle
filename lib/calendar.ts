const DAY_IN_MS = 24 * 60 * 60 * 1000

export interface GoalCalendarEvent {
  goalId: string
  title: string
  targetDate: string
  url: string
}

function dateOnlyToUtc(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toCalendarDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

function escapeIcsText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function foldIcsLine(value: string) {
  const chunks: string[] = []
  let remaining = value

  while (remaining.length > 73) {
    chunks.push(remaining.slice(0, 73))
    remaining = remaining.slice(73)
  }

  chunks.push(remaining)
  return chunks.join('\r\n ')
}

export function getGoalCalendarDates(targetDate: string) {
  const start = dateOnlyToUtc(targetDate)
  const end = new Date(start.getTime() + DAY_IN_MS)
  return { start: toCalendarDate(start), end: toCalendarDate(end) }
}

export function createGoogleCalendarUrl(event: GoalCalendarEvent) {
  const dates = getGoalCalendarDates(event.targetDate)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Goal target: ${event.title}`,
    dates: `${dates.start}/${dates.end}`,
    details: `Target date for “${event.title}” on GoalCircle.\n\nOpen goal: ${event.url}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function createGoalIcs(event: GoalCalendarEvent, generatedAt = new Date()) {
  const dates = getGoalCalendarDates(event.targetDate)
  const stamp = generatedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoalCircle//Goal target//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.goalId)}@goalcircle.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dates.start}`,
    `DTEND;VALUE=DATE:${dates.end}`,
    `SUMMARY:${escapeIcsText(`Goal target: ${event.title}`)}`,
    `DESCRIPTION:${escapeIcsText(`Target date for “${event.title}” on GoalCircle.\n\nOpen goal: ${event.url}`)}`,
    `URL:${escapeIcsText(event.url)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export function calendarFileName(title: string) {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${safeTitle || 'goalcircle-goal'}.ics`
}
