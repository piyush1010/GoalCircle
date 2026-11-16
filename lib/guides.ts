// "How this page works": short, example-led guides for each main screen.
// Each step can point at a section (a CSS selector); tapping the step scrolls there and highlights it.

export interface GuideStep { title: string; text: string; example?: string; target?: string }
export interface Guide { title: string; intro: string; steps: GuideStep[] }

const HOME: Guide = {
  title: 'Home',
  intro: 'Your goals at the top, and everything due today in one list below.',
  steps: [
    { title: 'Your goals', target: '[data-guide="goals"]', text: 'Each circle is one goal: an exam, a personal goal, or a batch you run. The ring fills as you finish today’s part. Tap a circle to open it.', example: 'Tap UPSC to open your study plan; tap Fitness to see your streak.' },
    { title: 'Today', target: '[data-guide="deck"]', text: 'Study, revision, your mentor’s task, personal goals and to-dos, across all your goals. Tap Done as you finish each one. Anything tapped by mistake can be undone.', example: 'You revise Fundamental Rights and remember most of it: tap Got it, and it comes back in a week rather than three days.' },
    { title: 'The + button', text: 'Log a goal, start the focus timer, add a mistake or a one-off task, set a new goal, or join a batch.' },
  ],
}

export const GUIDES: { match: (path: string) => boolean; pick?: () => boolean; guide: Guide }[] = [
  { match: (p) => p === '/dashboard', guide: HOME },
  {
    match: (p) => p === '/prep/plan',
    guide: {
      title: 'Plan', intro: 'How much to do each day to finish before your exam, and exactly what.',
      steps: [
        { title: 'Your daily target', target: '[data-guide="plan-target"]', text: 'Subtopics left ÷ study days left. The last 15% of days are kept free for revision. It is worked out again every morning.', example: '470 subtopics, 127 study days → 4 a day. Miss a day and it becomes 4 or 5; get ahead and it drops.' },
        { title: 'Today’s list', target: '[data-guide="plan-today"]', text: 'Tick each subtopic as you finish it. Ticks also show on Today and in your Syllabus.' },
        { title: 'Focus timer', target: '[data-guide="plan-timer"]', text: 'Pick a subtopic and tap Focus. When you finish, “Done with this subtopic” saves the time and ticks it in one go.' },
        { title: 'More than one exam?', target: '[data-guide="exam-switcher"]', text: 'Switch exams here. Exams lets you add one, remove one you were only exploring, or bring one back; ticks are never lost. Today shows all exams, or pick one at the top.', example: 'UPSC and UPPCS share Polity: tick it once and it counts for both.' },
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
      { title: 'Add a mistake', text: 'After a mock or PYQ set, add what went wrong and the correct fact.', example: '“Misread the statement”, Polity, “Article 32 is itself a fundamental right.”' },
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
      { title: 'Add a note', text: 'Write one line, pick the kind, link a topic if it fits.', example: '“SC ruling on Governor’s assent timelines”, Judgment, Polity.' },
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
]

export function guideFor(path: string): Guide | null {
  for (const g of GUIDES) if (g.match(path) && (!g.pick || g.pick())) return g.guide
  return null
}
