// "How this page works": short, example-led guides for each main screen.
// Each step can point at a section (a CSS selector); tapping the step scrolls there and highlights it.

export interface GuideStep { title: string; text: string; example?: string; target?: string }
export interface Guide { title: string; intro: string; steps: GuideStep[] }

const PREP_TODAY: Guide = {
  title: 'Today',
  intro: 'Your plan for today, one card at a time: what to study, what to revise, and your goals. Swipe through and act on each.',
  steps: [
    { title: 'One task per slide', target: '[data-guide="deck"]', text: 'Your mentor’s task, revisions due, today’s subtopics and personal goals, across all your exams.', example: 'Slide 1: “Revise · Fundamental Rights”. Slide 2: “Study · Directive Principles”.' },
    { title: 'Tap the one big button', target: '[data-guide="deck"]', text: 'Done ticks a subtopic. For a revision, say how much you remembered; that sets when it comes back. Tapped by mistake? Undo, on the card or in the message that pops up.', example: 'You revise Fundamental Rights and remember most of it: tap Got it, and it returns in a week instead of 3 days.' },
    { title: 'Focus with the timer', target: '[data-guide="deck"]', text: 'Focus on a study card starts a 25-minute Pomodoro. Finish to save the minutes and tick the subtopic.', example: 'Two rounds on “Directive Principles” saves 50 minutes to your week.' },
    { title: 'Log, plan, share', target: '[data-guide="deck-actions"]', text: 'Log adds anything else (PYQs, a mock, an answer). Plan shows the days ahead. Share is off unless you choose followers, everyone or WhatsApp.' },
  ],
}

const GOALS_TODAY: Guide = {
  title: 'Today',
  intro: 'Your goals and your batch’s task for today, with your month at a glance.',
  steps: [
    { title: 'Check in', target: '[data-tour="today-checkin"]', text: 'Tap Check in when you have done today’s part. Add a note or a photo if you like; it takes seconds.', example: '“Run 3 km” → Check in → Done → “Felt easy today”.' },
    { title: 'Your month', target: '[data-tour="today-ring"]', text: 'Every day you show up fills a piece of the ring. Missed days are honest, not failures.' },
    { title: 'Preparing for an exam?', text: 'Turn on exam preparation in Settings to get a daily study plan here instead.' },
  ],
}

export const GUIDES: { match: (path: string) => boolean; pick?: () => boolean; guide: Guide }[] = [
  { match: (p) => p === '/dashboard', pick: () => Boolean(document.querySelector('[data-guide="deck"]')), guide: PREP_TODAY },
  { match: (p) => p === '/dashboard', guide: GOALS_TODAY },
  {
    match: (p) => p === '/prep/plan',
    guide: {
      title: 'Plan', intro: 'How much to do each day to finish before your exam, and exactly what.',
      steps: [
        { title: 'Your daily target', target: '[data-guide="plan-target"]', text: 'Subtopics left ÷ study days left. The last 15% of days are kept free for revision. It is worked out again every morning.', example: '470 subtopics, 127 study days → 4 a day. Miss a day and it becomes 4 or 5; get ahead and it drops.' },
        { title: 'Today’s list', target: '[data-guide="plan-today"]', text: 'Tick each subtopic as you finish it. Ticks also show on Today and in your Syllabus.' },
        { title: 'Study timer', target: '[data-guide="plan-timer"]', text: 'Pick a subtopic and start. “Done · tick” saves the time and ticks it in one go.' },
        { title: 'More than one exam?', target: '[data-guide="exam-switcher"]', text: 'Switch exams here, or add another. Today always shows all of them together.', example: 'UPSC and UPPCS share Polity: tick it once and it counts for both.' },
      ],
    },
  },
  {
    match: (p) => p === '/prep',
    guide: {
      title: 'Syllabus', intro: 'The official syllabus, broken into subtopics you can tick.',
      steps: [
        { title: 'Prelims, Mains and more', target: '[data-guide="syllabus-tabs"]', text: 'Each tab is one stage of your exam.' },
        { title: 'Find or filter', target: '[data-guide="syllabus-search"]', text: 'Search any topic or subtopic. “Due” shows only topics whose revision is due.', example: 'Type “Article 21” to jump to Fundamental Rights.' },
        { title: 'Open a topic, tick subtopics', target: '[data-guide="syllabus-list"]', text: 'Open a topic and tick each subtopic once studied. Already finished a whole subject? Use “Already done? Tick all”.', example: 'Polity → Constitution → tick “Preamble” and “Fundamental Rights” → the topic shows 2/10 and its first revision is set for 3 days later.' },
        { title: 'Revise', target: '[data-guide="syllabus-list"]', text: 'Inside a topic, “I revised this topic” asks how much you remembered and schedules the next one.' },
      ],
    },
  },
  {
    match: (p) => p === '/prep/progress',
    guide: {
      title: 'Progress', intro: 'Where you stand, from what you have logged. Nothing here is guessed.',
      steps: [
        { title: 'Your level and this week', target: '[data-guide="progress-summary"]', text: 'Your band (Getting started → Highly prepared) and this week against last week.', example: 'If 3 revisions are overdue, you will see “Revise 3 topics to win back 4 points”. Revise them and the points return the same day.' },
        { title: 'Open any row for detail', target: '[data-guide="progress-rows"]', text: 'By stage, coverage, mocks, mistakes, past papers and notes each open on tap.' },
        { title: 'Share with your mentor', text: 'Further down, choose per batch whether your mentor sees nothing, a summary, or full detail.' },
      ],
    },
  },
  {
    match: (p) => p === '/prep/mistakes',
    guide: { title: 'Mistake notebook', intro: 'Every wrong answer worth remembering, until it sticks.', steps: [
      { title: 'Add a mistake', text: 'After a mock or PYQ set, add what went wrong and the correct fact.', example: '“Misread the statement” · Polity · “Article 32 is itself a fundamental right.”' },
      { title: 'Revisit', text: 'Read the open ones before your next mock and tap “Got it” when it sticks.' },
    ] },
  },
  {
    match: (p) => p === '/prep/pyq',
    guide: { title: 'Past papers', intro: 'Solve a full past paper in exam time, then log it here.', steps: [
      { title: 'Pick a year', text: 'Enter how many you attempted and got right. Marks use that paper’s negative marking.', example: 'UPSC 2023: 82 attempted, 58 right → about 100 marks, 71% accuracy.' },
    ] },
  },
  {
    match: (p) => p === '/prep/notes',
    guide: { title: 'Current affairs', intro: 'One line a day from the news, linked to your syllabus.', steps: [
      { title: 'Add a note', text: 'Write one line, pick the kind, link a topic if it fits.', example: '“SC ruling on Governor’s assent timelines” · Judgment · Polity.' },
      { title: 'Copy a month', text: 'At month end, “Copy month” gives you a ready revision sheet.' },
    ] },
  },
  {
    match: (p) => p === '/circles',
    guide: { title: 'Circles', intro: 'Small groups that keep each other going: a coaching batch, friends, or study partners.', steps: [
      { title: 'Join or create', text: 'Join with an invite link from your mentor, or create one and share its link.', example: 'Your mentor sends “Join UPSC 2027 Morning Batch” on WhatsApp: tap it and you are in.' },
    ] },
  },
  {
    match: (p) => p.startsWith('/circles/'),
    guide: { title: 'Your batch', intro: 'Today’s task from your mentor, and how the batch is doing.', steps: [
      { title: 'Check in on the task', target: '[data-tour="checkin"]', text: 'Say Done, Partly or Missed, with an optional photo. Your mentor sees it.' },
      { title: 'Mentors', target: '[data-tour="task"]', text: 'Post the day’s task, see who checked in, nudge the rest, and review answers students send.' },
    ] },
  },
  {
    match: (p) => p === '/feed',
    guide: { title: 'Feed', intro: 'Check-ins from people you follow. Cheer them on; they will cheer you back.', steps: [
      { title: 'React and comment', text: 'A quick boost on someone’s check-in keeps them going.' },
    ] },
  },
  {
    match: (p) => p === '/check-in',
    guide: { title: 'Check in', intro: 'Ten seconds: which goal, how it went, done.', steps: [
      { title: 'Pick how today went', target: '[data-tour="checkin-status"]', text: 'Done, Partial or Missed. Honest misses are fine and keep your record real.' },
      { title: 'Private or public', target: '[data-tour="checkin-submit"]', text: 'Private check-ins are only for you. Public ones can include a photo.' },
    ] },
  },
  {
    match: (p) => p === '/create-goal',
    guide: { title: 'New goal', intro: 'Name it, choose how often, and who can see it.', steps: [
      { title: 'Keep it small', target: '[data-tour="goal-title"]', text: 'A goal you can do today works best.', example: '“Read 10 pages” beats “Read more”.' },
    ] },
  },
]

export function guideFor(path: string): Guide | null {
  for (const g of GUIDES) if (g.match(path) && (!g.pick || g.pick())) return g.guide
  return null
}
