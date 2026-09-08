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
