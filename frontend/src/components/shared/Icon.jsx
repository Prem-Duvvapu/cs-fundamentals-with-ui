// One consistent stroke-icon set for application controls. Icons are decorative by default:
// the surrounding control carries the accessible name (visible text or aria-label).
const PATHS = {
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM21 21l-5.2-5.2',
  interview: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5Z M8.5 8.5h7 M8.5 12h4',
  progress: 'M4 20V10 M10 20V4 M16 20v-7 M21 20H3',
  review: 'M4 12a8 8 0 1 0 2.35-5.65L4 8.7 M4 4v4.7h4.7 M12 8v4.5l3 1.8',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.9 M12 17h.01',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M12 2.5v2 M12 19.5v2 M4.6 4.6 6 6 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4 6 18 M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm6 15 6-6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5 M11 6l-6 6 6 6',
  bookmark: 'M6.5 3.5h11v17L12 16.5l-5.5 4Z',
  check: 'M5 12.5 10 17.5 19 7',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M8 12.3l2.7 2.7L16 9.7',
  circle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z M4 20.5A2.5 2.5 0 0 0 6.5 23H20 M8 7.5h8',
  sliders: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M15 4v4 M9 10v4 M17 16v4',
  focus: 'M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9 M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9 M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15 M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15',
  play: 'M7 4.5v15l12-7.5Z',
  layers: 'M12 3 3 8l9 5 9-5Z M3 13l9 5 9-5',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  collapse: 'm7 20 5-5 5 5 M7 4l5 5 5-5',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
  trash: 'M4 7h16 M9.5 7V4.5h5V7 M6.5 7l1 13h9l1-13'
}

export default function Icon({ name, size = 18, className = '', filled = false }) {
  return (
    <svg
      className={`ui-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export const ICON_NAMES = Object.freeze(Object.keys(PATHS))
