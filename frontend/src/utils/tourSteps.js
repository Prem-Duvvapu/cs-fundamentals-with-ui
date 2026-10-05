// Ordered steps for the guided product tour (see hooks/useProductTour.js). `path` is the route
// the step's `target` lives on — the hook navigates there automatically when a step's path
// differs from the current one. `target` is a CSS selector into the live DOM; `null` renders a
// centered, spotlight-less card (used for the welcome/closing steps).
const DEMO_TOPIC_PATH = '/topic/cpu-scheduling'

const TOUR_STEPS = [
  {
    id: 'welcome',
    path: '/',
    target: null,
    title: 'Welcome to CS Fundamentals',
    body: 'A quick tour of learning paths, the reader, practice and progress — about a minute, and you can skip it any time.'
  },
  {
    id: 'learning-paths',
    path: '/',
    target: '.path-grid',
    title: 'Six learning paths',
    body: 'Each path opens an ordered list of lessons with outcomes and prerequisites. Java and Spring come first, then the systems and data foundations behind them.'
  },
  {
    id: 'browse',
    path: '/',
    target: '.browse-lessons-toggle',
    title: 'Browse every lesson',
    body: 'Open the full curriculum to filter by path, level or bookmarks. Filtered links can be bookmarked and shared.'
  },
  {
    id: 'search',
    path: '/',
    target: '.nav-search',
    title: 'Search everything',
    body: 'Search titles, headings, and lesson content across every topic. Ctrl + K (or ⌘ + K) opens it from anywhere.'
  },
  {
    id: 'interview-mode',
    path: '/',
    target: '.nav-item[href="/interview/all"]',
    title: 'Practice with Interview Mode',
    body: 'Step through interview questions for one category or the whole curriculum, filtered by difficulty.'
  },
  {
    id: 'topic-page',
    path: DEMO_TOPIC_PATH,
    target: '.topic-page-title',
    title: "Here's a lesson",
    body: 'Every lesson reads the same way: a three-tier study guide from Beginner to Expert, with interview practice at the end. Bookmark it or mark it complete when you are ready.'
  },
  {
    id: 'simulation-tab',
    path: DEMO_TOPIC_PATH,
    target: '.main-tab-switcher',
    title: 'Study, Practice and Simulation',
    body: 'Practice turns the interview questions into recall exercises. Lessons that benefit from one also get an interactive Simulation of the mechanism.'
  },
  {
    id: 'category-rail',
    path: DEMO_TOPIC_PATH,
    target: '.category-rail-tools',
    title: 'Every lesson in this path',
    body: 'The side rail lists all lessons in the category with their sections. Search it, expand any lesson, or collapse everything back to the titles.'
  },
  {
    id: 'finish',
    path: DEMO_TOPIC_PATH,
    target: null,
    title: "You're ready",
    body: 'That covers the essentials. Replay this tour any time from Help in the navigation bar.'
  }
]

export { TOUR_STEPS, DEMO_TOPIC_PATH }
