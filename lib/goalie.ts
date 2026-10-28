/** What Goalie says. Playful and warm, never guilt-tripping: teasing always ends kindly. */
export const GOALIE_LINES = {
  welcomeBack: [
    'What took you so long? I missed you!',
    'You made me wait… but I forgive you',
    'There you are! I saved your spot',
    'Welcome back! Let’s pick up where we left off.',
  ],
  encourage: [
    'You can do it!',
    'Even 10 minutes counts.',
    'Small steps, big dreams',
    'I believe in you',
    'Don’t overthink it. Just start.',
  ],
  cheer: [
    'You did it! So proud of you',
    'High five!',
    'One more day stronger',
    'That’s how it’s done',
  ],
  empty: [
    'Nothing here yet. Let’s start something?',
    'So quiet… let’s change that.',
  ],
  fall: [
    'Woah! You knocked me over 😵‍💫',
    'Oww, my antenna! I’m okay.',
  ],
  angry: [
    'Hey! Stop poking me!',
    'I’m telling on you! 😤',
  ],
  forgive: [
    'Okay, I’m not mad anymore 🥺',
    'Friends again?',
  ],
  tap: [
    'Hehe, that tickles',
    'Boop!',
    'Studying or poking me?',
    'Drink some water',
    'You’re doing better than you think',
    'Deep breath. You’ve got this.',
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
