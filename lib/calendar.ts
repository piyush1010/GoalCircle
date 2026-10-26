const DAY_IN_MS = 24 * 60 * 60 * 1000
const REMINDER_LENGTH_MS = 15 * 60 * 1000
/** Daily reminders for goals without a target date repeat for this many days. */
export const OPEN_ENDED_REMINDER_DAYS = 30

export interface GoalCalendarEvent {
  goalId: string
  title: string
  targetDate: string
  url: string
}

export interface DailyReminder {
  goalId: string
  title: string
  /** Local time of day, "HH:MM". */
  time: string
  /** Optional "YYYY-MM-DD"; reminders stop after this day. */
  targetDate?: string | null
  url: string
}

function dateOnlyToUtc(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toCalendarDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

/** UTC date-time in iCalendar / Google Calendar form, e.g. 20261027T023000Z. */
function toCalendarDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

/** Fold to 75 octets per line (RFC 5545) without splitting a character. */
function foldIcsLine(value: string) {
  const encoder = new TextEncoder()
  const lines: string[] = []
  let current = ''
  let currentBytes = 0
  for (const char of value) {
    const size = encoder.encode(char).length
    const limit = lines.length === 0 ? 75 : 74 // continuation lines start with a space
    if (currentBytes + size > limit) {
      lines.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += size
  }
  lines.push(current)
  return lines.join('\r\n ')
}

function wrapCalendar(eventBlocks: string[][]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoalCircle//Goal calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks.flat(),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
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

function targetDateEventLines(event: GoalCalendarEvent, stamp: string) {
  const dates = getGoalCalendarDates(event.targetDate)
  return [
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
  ]
}

export function createGoalIcs(event: GoalCalendarEvent, generatedAt = new Date()) {
  return wrapCalendar([targetDateEventLines(event, toCalendarDateTime(generatedAt))])
}

/**
 * When the daily reminder series starts and stops, in UTC.
 * The first reminder is today if the chosen time is still ahead, otherwise tomorrow.
 * Times are computed in the browser's local time zone.
 */
export function getDailyReminderSchedule(reminder: Pick<DailyReminder, 'time' | 'targetDate'>, now = new Date()) {
  const [hours, minutes] = reminder.time.split(':').map(Number)
  const start = new Date(now)
  start.setHours(hours, minutes, 0, 0)
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 1)

  let until: Date | null = null
  if (reminder.targetDate) {
    const [year, month, day] = reminder.targetDate.split('-').map(Number)
    until = new Date(year, month - 1, day, 23, 59, 59)
    if (until.getTime() < start.getTime()) until = start // target date is today and the time has passed
  }

  const end = new Date(start.getTime() + REMINDER_LENGTH_MS)
  const rule = until
    ? `RRULE:FREQ=DAILY;UNTIL=${toCalendarDateTime(until)}`
    : `RRULE:FREQ=DAILY;COUNT=${OPEN_ENDED_REMINDER_DAYS}`
  return { start, end, rule }
}

function reminderText(reminder: DailyReminder) {
  return {
    summary: `GoalCircle: ${reminder.title}`,
    details: `Time to work on “${reminder.title}”. Check in on GoalCircle to keep your streak.\n\nOpen goal: ${reminder.url}`,
  }
}

export function createGoogleDailyReminderUrl(reminder: DailyReminder, now = new Date()) {
  const { start, end, rule } = getDailyReminderSchedule(reminder, now)
  const { summary, details } = reminderText(reminder)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${toCalendarDateTime(start)}/${toCalendarDateTime(end)}`,
    recur: rule,
    details,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function dailyReminderEventLines(reminder: DailyReminder, stamp: string, now: Date) {
  const { start, end, rule } = getDailyReminderSchedule(reminder, now)
  const { summary, details } = reminderText(reminder)
  return [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(reminder.goalId)}-daily@goalcircle.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toCalendarDateTime(start)}`,
    `DTEND:${toCalendarDateTime(end)}`,
    rule,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    `URL:${escapeIcsText(reminder.url)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
  ]
}

/** One file with the daily reminder and/or the target date, for Apple Calendar and Outlook. */
export function createGoalCalendarBundle(
  options: { goal?: GoalCalendarEvent | null; reminder?: DailyReminder | null },
  now = new Date(),
) {
  const stamp = toCalendarDateTime(now)
  const blocks: string[][] = []
  if (options.reminder) blocks.push(dailyReminderEventLines(options.reminder, stamp, now))
  if (options.goal) blocks.push(targetDateEventLines(options.goal, stamp))
  return wrapCalendar(blocks)
}

export function calendarFileName(title: string) {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${safeTitle || 'goalcircle-goal'}.ics`
}
