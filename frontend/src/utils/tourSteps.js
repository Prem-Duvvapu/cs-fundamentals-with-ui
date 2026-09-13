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
    body: 'A quick tour of the roadmap, study tools, and progress tracking — about a minute, and you can skip it any time.'
  },
  {
    id: 'categories',
    path: '/',
    target: '.roadmap-selectors',
    title: 'Six curriculum tracks',
    body: 'Filter the roadmap down to one track at a time, or keep the full sequence — Java and Spring first, then the systems and data foundations behind it.'
  },
  {
    id: 'levels',
    path: '/',
    target: '.level-selectors',
    title: 'Level and bookmark filters',
    body: 'Narrow topics by Beginner/Intermediate/Expert, or flip on "Bookmarked" to see only the topics you have starred.'
  },
  {
    id: 'topic-row',
    path: '/',
    target: '.topic-row',
    title: 'Bookmark, then study',
    body: 'Star a topic to save it for later, or jump straight into the reader with Study topic.'
  },
  {
    id: 'progress-transfer',
    path: '/',
    target: '.progress-transfer-actions',
    title: 'Back up your progress',
    body: 'Bookmarks and completion live only in this browser. Export them to a file any time, and import that file to restore or move to another device.'
  },
  {
    id: 'search',
    path: '/',
    target: '.navbar-icon-link[aria-label="Search"]',
    title: 'Search everything',
    body: 'Search titles, headings, and lesson content across every topic in the curriculum.'
  },
  {
    id: 'interview-mode',
    path: '/',
    target: '.navbar-icon-link[aria-label="Interview Mode"]',
    title: 'Practice with Interview Mode',
    body: 'Step through interview questions for one category or the whole curriculum, filtered by difficulty.'
  },
  {
    id: 'topic-page',
    path: DEMO_TOPIC_PATH,
    target: '.topic-page-title',
    title: "Here's a topic page",
    body: 'Every topic reads the same way: a 3-tier study guide from Beginner to Expert, with an interview deck at the end.'
  },
  {
    id: 'simulation-tab',
    path: DEMO_TOPIC_PATH,
    target: '.main-tab-switcher',
    title: 'Interactive simulations',
    body: 'Topics that benefit from one get a Simulation tab — an interactive visualizer for the mechanism, alongside the Study tab.'
  },
  {
    id: 'finish',
    path: DEMO_TOPIC_PATH,
    target: null,
    title: "You're ready",
    body: 'That covers the essentials. Replay this tour any time from the "Take a tour" button in the navigation bar.'
  }
]

export { TOUR_STEPS, DEMO_TOPIC_PATH }
