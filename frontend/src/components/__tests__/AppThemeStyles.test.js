import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appCss = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')

function ruleBody(selector) {
  const match = appCss.match(new RegExp(`(?:^|\\r?\\n)${selector}\\s*\\{([^}]+)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match[1]
}

describe('theme-aware visualizer surfaces', () => {
  it('uses semantic theme colors for shared form controls', () => {
    const controls = ruleBody('\\.select-input, \\.num-input, \\.text-input')

    expect(controls).toMatch(/background:\s*var\(--bg-inset\)/)
    expect(controls).toMatch(/color:\s*var\(--text-primary\)/)
    expect(controls).toMatch(/border:\s*1px solid var\(--border-default\)/)
  })

  it('does not reintroduce the legacy dark background into themed components', () => {
    expect(appCss).not.toMatch(/background(?:-color)?\s*:[^;{}]*#0f172a/i)
  })

  it('keeps diagram surfaces distinct with semantic inset and raised tokens', () => {
    expect(ruleBody('\\.gantt-chart')).toMatch(/background:\s*var\(--bg-inset\)/)
    expect(ruleBody('\\.frame-box')).toMatch(/background:\s*var\(--bg-inset\)/)
    expect(ruleBody('\\.viz-table th')).toMatch(/background:\s*var\(--bg-raised\)/)
    expect(ruleBody('\\.cpu-status-card')).toMatch(
      /background:\s*linear-gradient\(135deg, var\(--cat-os-tint\) 0%, var\(--bg-inset\) 100%\)/
    )
  })
})

function themeTokens(theme) {
  const root = ruleBody(':root')
  const overrides = theme === 'light' ? ruleBody('\\[data-theme="light"\\]') : ''
  return Object.fromEntries([...`${root} ${overrides}`.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)]
    .map(([, name, color]) => [name, color]))
}

function contrast(first, second) {
  const luminance = color => {
    const channels = color.slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  }
  const [bright, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (bright + .05) / (dark + .05)
}

describe.each(['dark', 'light'])('%s theme reading contrast', theme => {
  const tokens = themeTokens(theme)
  const surfaces = ['page', 'surface', 'raised', 'code', 'inset', 'overlay']
  it.each(['primary', 'prose', 'secondary', 'muted'])('keeps %s text readable on every neutral surface', role => {
    for (const surface of surfaces) {
      expect(contrast(tokens[`--text-${role}`], tokens[`--bg-${surface}`]), `${role} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it.each(['os', 'networking', 'dbms', 'java', 'aiml', 'devops'])('keeps %s category labels and filled actions readable', category => {
    const foreground = tokens[`--cat-${category}-base`]
    expect(contrast(foreground, tokens[`--cat-${category}-tint`])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(foreground, tokens['--text-inverse'])).toBeGreaterThanOrEqual(4.5)
  })
  it('keeps every syntax color readable on the code surface', () => {
    for (const [name, color] of Object.entries(tokens).filter(([name]) => name.startsWith('--syn-'))) {
      expect(contrast(color, tokens['--bg-code']), name).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('keeps keyboard focus and selected text visible', () => {
    for (const surface of surfaces) {
      expect(contrast(tokens['--border-focus'], tokens[`--bg-${surface}`]), surface).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(tokens['--selection-text'], tokens['--selection-bg'])).toBeGreaterThanOrEqual(4.5)
  })
})

describe.each(['dark', 'light'])('%s theme product actions', theme => {
  const tokens = themeTokens(theme)
  const surfaces = ['page', 'surface', 'raised', 'overlay']
  it('keeps primary action text readable on its fill and the fill distinct from the page', () => {
    expect(contrast(tokens['--action-fg'], tokens['--action-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens['--action-fg'], tokens['--action-bg-hover'])).toBeGreaterThanOrEqual(4.5)
    for (const surface of ['page', 'surface']) {
      expect(contrast(tokens['--action-bg'], tokens[`--bg-${surface}`]), surface).toBeGreaterThanOrEqual(3)
    }
  })
  it('keeps action-coloured text and selected states readable', () => {
    for (const surface of surfaces) {
      expect(contrast(tokens['--action-text'], tokens[`--bg-${surface}`]), surface).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(tokens['--text-primary'], tokens['--action-tint'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens['--border-focus'], tokens['--action-tint'])).toBeGreaterThanOrEqual(3)
  })
  it('keeps text readable on secondary control fills', () => {
    for (const fill of ['--control-bg', '--control-bg-hover']) {
      expect(contrast(tokens['--text-primary'], tokens[fill]), fill).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens['--text-secondary'], tokens[fill]), fill).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('October 5 component system', () => {
  it('keeps the spacing scale monotonic with a single definition per step', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(step => {
      const definitions = [...appCss.matchAll(new RegExp(`--space-${step}:\\s*([\\d.]+)(rem|px)`, 'g'))]
      expect(definitions, `--space-${step}`).toHaveLength(1)
      const [, value, unit] = definitions[0]
      return unit === 'rem' ? Number(value) * 16 : Number(value)
    })
    steps.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(steps[index]))
  })
  it('keeps raw colour literals inside the theme token blocks', () => {
    const outsideThemes = appCss.slice(appCss.indexOf('[data-category="os"]'))
    expect(outsideThemes).not.toMatch(/(?:background|color|border(?:-color)?)\s*:[^;{}]*#[0-9a-f]{3,6}\b(?![^;{}]*var\()/i)
  })
})
