/** What Goalie says. Playful like a little kid, never guilt-tripping: teasing always ends in a hug. */
export const GOALIE_LINES = {
  welcomeBack: [
    'What took you so long? I missed you! 🥺',
    'You made me wait… but I forgive you! 🤗',
    'Hmph! I waited and waited… okay, hug first 🤗',
    'Yay, you’re back! I saved your spot 💛',
    'There you are! I was counting the days 🥹',
  ],
  encourage: [
    'You can do it! 💪',
    'Even 10 minutes counts!',
    'Small steps, big dreams ✨',
    'I believe in you. Like, a LOT. 🥹',
    'Don’t overthink it. Just start! 🚀',
    'Future you says thank you 💛',
  ],
  cheer: [
    'You did it! I’m so proud! 🎉',
    'Yaaay! High five! ✋',
    'Look at you go! 🚀',
    'That’s my friend! 💪',
    'One more day stronger! 🌱',
  ],
  empty: [
    'Yawn… nothing here yet. Wake me up? 😴',
    'It’s so quiet… let’s make some noise! 🥁',
    'I’m bored! Let’s start something 🙃',
  ],
  tap: [
    'Hehe, that tickles! 😆',
    'Boop! 👉',
    'Are you studying or poking me? 🤨',
    'Okay okay, I’m awake! 😳',
    'Drink some water! 💧',
    'You’re doing better than you think 💛',
    'Take a deep breath with me… 🌬️',
  ],
} as const

export type GoalieLineSet = keyof typeof GOALIE_LINES

export const pickLine = (set: GoalieLineSet, avoid?: string) => {
  const lines = GOALIE_LINES[set].filter((line) => line !== avoid)
  return lines[Math.floor(Math.random() * lines.length)]
}

export const CHEER_EVENT = 'goalcircle:cheer'

/** Ask Goalie to celebrate (after a check-in). Survives the page change that follows. */
export function cheer() {
  try { window.sessionStorage.setItem('goalcircle-cheer', '1') } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CHEER_EVENT))
}
