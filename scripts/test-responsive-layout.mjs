#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { catalog, frontendRequire as require, launchChromium, repoRoot, routeFixtureApi, startStaticServer } from './lib/ui-fixtures.mjs'

const server = await startStaticServer()
const origin = server.origin
const browser = await launchChromium()
const failures = []
let simulatorCount = 0
const screenshotDir = process.env.CS_SCREENSHOT_DIR
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true })

try {
  const page = await browser.newPage()
  page.on('pageerror', error => failures.push(`page error: ${error.message}`))
  await routeFixtureApi(page)

  await page.goto(origin)
  await page.evaluate(() => localStorage.setItem('cs-fundamentals-theme', 'dark'))
  await page.reload()
  await page.locator('html[data-theme="dark"]').waitFor()
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  if (darkBackground !== 'rgb(26, 26, 26)') failures.push(`Dark page did not use the neutral charcoal surface: ${darkBackground}`)
  await page.getByRole('button', { name: 'Switch to light theme' }).focus()
  await page.keyboard.press('Enter')
  await page.locator('html[data-theme="light"]').waitFor()
  await page.reload()
  await page.locator('html[data-theme="light"]').waitFor()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.locator('html[data-theme="dark"]').waitFor()

  const routes = [
    '/',
    '/topic/java-execution-pipeline',
    '/topic/process-management',
    '/topic/application-layer',
    '/topic/java-hashmap-internals',
    '/topic/dbms-indexing',
    '/topic/embeddings-vector-db',
    '/topic/docker-fundamentals',
    '/search?q=java',
    '/interview/all',
    '/category/java-spring',
    '/progress',
    '/review',
    '/not-a-real-route'
  ]
  const widths = [320, 375, 768, 1024, 1440]

  for (const theme of ['dark', 'light']) {
    await page.evaluate(selectedTheme => localStorage.setItem('cs-fundamentals-theme', selectedTheme), theme)
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of routes) {
        if (page.url().startsWith(origin)) await page.evaluate(() => { localStorage.removeItem('cs-fundamentals-learning-v1'); localStorage.removeItem('cs-fundamentals-progress') })
        await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' })
        await page.locator('h1').first().waitFor({ timeout: 15_000 })
        await page.locator(`html[data-theme="${theme}"]`).waitFor({ timeout: 15_000 })
        if (route.startsWith('/topic/')) await page.locator('.topic-content h2').first().waitFor({ timeout: 15_000 })
        if (route.startsWith('/topic/')) {
          const toc = page.locator('#topic-table-of-contents')
          if ((await toc.isVisible()) !== (width >= 1024)) failures.push(`${theme} ${width}px ${route}: incorrect initial TOC visibility`)
          const toggle = page.locator('.toc-toggle')
          if (width >= 1024) {
            // Desktop keeps the rail visible; Focus reading is the explicit way to hide it.
            if (await toggle.isVisible()) failures.push(`${theme} ${width}px ${route}: desktop shows a redundant topics toggle`)
          } else {
            await toggle.click()
            if (!(await toc.isVisible())) failures.push(`${theme} ${width}px ${route}: Topics disclosure did not open`)
            const bounded = await toc.evaluate(element => element.getBoundingClientRect().height <= window.innerHeight * 0.7 && element.scrollHeight >= element.clientHeight)
            if (!bounded) failures.push(`${theme} ${width}px ${route}: open Topics panel is not bounded`)
            await toggle.click()
            if (await toc.isVisible()) failures.push(`${theme} ${width}px ${route}: Topics disclosure did not close`)
          }
          const headingCount = await page.locator('.topic-content h2[id], .topic-content h3[id]').count()
          await page.waitForFunction(count => document.querySelectorAll('.category-topic-item--current .category-topic-sections a').length === count, headingCount)
          const category = catalog.find(topic => route === `/topic/${topic.id}`).category
          if (await toc.locator('.category-topic-link').count() !== catalog.filter(topic => topic.category === category).length) failures.push(`${theme} ${width}px ${route}: missing category lessons`)
          if (await toc.locator('.category-topic-item--current .category-topic-sections a').count() !== headingCount) failures.push(`${theme} ${width}px ${route}: missing subsection navigation`)
        }
        if (screenshotDir && [375, 1440].includes(width) && ['/', '/topic/java-execution-pipeline', '/category/java-spring'].includes(route)) {
          await page.screenshot({ path: path.join(screenshotDir, `${theme}-${width}-${route.replaceAll('/', '_') || 'home'}.png`), fullPage: false })
        }
        const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
        if (dimensions.document > dimensions.viewport + 1) {
          failures.push(`${theme} ${width}px ${route}: document width ${dimensions.document}px`)
        }
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${origin}/topic/spring-testing-production`)
  await page.locator('.topic-content h3').first().waitFor()
  const currentLessonInRail = await page.locator('.category-topic-item--current .category-topic-row').evaluate(row => {
    const rail = row.closest('.study-navigation').getBoundingClientRect()
    const bounds = row.getBoundingClientRect()
    return bounds.top >= rail.top - 1 && bounds.bottom <= rail.bottom + 1
  })
  if (!currentLessonInRail) failures.push('Current lesson was outside the scrollable category rail')

  for (const category of ['os', 'networking', 'dbms', 'java-spring', 'aiml', 'devops']) {
    const topics = catalog.filter(topic => topic.category === category).sort((a, b) => a.order - b.order)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${origin}/topic/${topics[0].id}?source=course`)
    const tree = page.locator('.category-topic-navigation')
    await page.locator('.topic-content h3').first().waitFor()
    const other = tree.locator('.category-topic-item').filter({ has: page.locator(`a.category-topic-link[href="/topic/${topics[1].id}"]`) })
    const toggle = other.locator('button')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await other.locator('.category-topic-sections a').first().waitFor()
    const sectionLink = other.locator('.category-topic-sections .toc-subsection a').first()
    const targetHash = new URL(await sectionLink.getAttribute('href'), origin).hash
    await sectionLink.click()
    await page.waitForURL(url => url.pathname === `/topic/${topics[1].id}` && url.hash === targetHash)
    await page.waitForFunction(hash => document.getElementById(hash.slice(1)) !== null, targetHash)
    if (new URL(page.url()).searchParams.get('source') !== 'course') failures.push(`${category}: section navigation lost context`)
    if ((await tree.locator(`a.category-topic-link[href="/topic/${topics[1].id}"]`).getAttribute('aria-current')) !== 'page') failures.push(`${category}: current lesson not marked`)
    if ((await tree.locator(`a.category-topic-link[href="/topic/${topics[0].id}"]`).locator('..').locator('button').getAttribute('aria-expanded')) !== 'true') failures.push(`${category}: expanded lesson reset after navigation`)
    await page.waitForFunction(hash => document.querySelector(`.category-topic-item--current a[href$="${hash}"]`)?.getAttribute('aria-current') === 'location', targetHash)
    await toggle.focus()
    await page.keyboard.press('Space')
    if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push(`${category}: keyboard collapse failed`)
    await page.reload()
    await page.waitForFunction(hash => document.getElementById(hash.slice(1)) !== null, targetHash)
    if ((await tree.locator('.category-topic-item--current button').getAttribute('aria-expanded')) !== 'true') failures.push(`${category}: current lesson closed after reload`)
  }

  await page.goto(`${origin}/topic/process-management?source=course`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: 'Simulation' }).click()
  if (!new URL(page.url()).searchParams.has('source')) failures.push('Tab selection lost an unrelated query parameter')
  await page.reload()
  if (await page.getByRole('tab', { name: 'Simulation' }).getAttribute('aria-selected') !== 'true') failures.push('Simulation selection did not survive refresh')
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.goBack()
  if (await page.getByRole('tab', { name: 'Simulation' }).getAttribute('aria-selected') !== 'true') failures.push('Simulation selection did not follow browser history')
  if (!(await page.title()).includes('Process Management')) failures.push('Topic browser title is missing')

  await page.goto(`${origin}/category/java-spring`)
  await page.getByRole('heading', { level: 1, name: 'Java & Spring' }).waitFor()
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Learning paths' }).click()
  await page.waitForFunction(() => document.title.startsWith('Learning paths'))
  if (!(await page.locator('#main-content').evaluate(element => document.activeElement === element))) failures.push('Pathname navigation did not focus the main landmark')
  if ((await page.locator('#main-content').getAttribute('aria-label')) !== 'Learning paths') failures.push('Main landmark does not name the destination page')

  await page.goto(`${origin}/topic/java-execution-pipeline`)
  await page.locator('.topic-content h3').first().waitFor()
  await page.getByRole('button', { name: 'Wrap code' }).first().evaluate(element => element.click())
  if (await page.getByRole('button', { name: 'Wrap code' }).first().getAttribute('aria-pressed') !== 'true') failures.push('Code wrap did not turn on')
  await page.getByRole('button', { name: 'Reading options' }).click()
  await page.getByRole('button', { name: 'Focus reading' }).click()
  if (await page.locator('.study-layout--focused').count() !== 1) failures.push('Focus reading did not hide the rail')
  await page.keyboard.press('Escape')
  if (!(await page.getByRole('button', { name: 'Reading options' }).evaluate(element => document.activeElement === element))) failures.push('Escape did not return focus to Reading options')
  await page.getByRole('button', { name: 'Exit focus reading' }).click()
  if (await page.getByRole('button', { name: 'Wrap code' }).first().getAttribute('aria-pressed') !== 'true') failures.push('Code wrap reset after a reader setting changed')
  await page.getByRole('tab', { name: 'Practice' }).click()
  await page.getByRole('textbox').waitFor()
  if (!(await page.getByRole('tab', { name: 'Practice' }).evaluate(element => document.activeElement === element))) failures.push('Study to Practice changed keyboard focus')
  await page.getByRole('tab', { name: 'Study' }).click()
  if (!(await page.getByRole('tab', { name: 'Study' }).evaluate(element => document.activeElement === element))) failures.push('Practice to Study changed keyboard focus')
  await page.locator('#intermediate-level').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25))
  try {
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('cs-fundamentals-learning-v1') || '{}').reading?.['java-execution-pipeline']?.headingId === 'intermediate-level', null, { timeout: 3000 })
  } catch { failures.push('Reading position did not update after returning from Practice') }

  await page.evaluate(() => localStorage.setItem('cs-fundamentals-learning-v1', JSON.stringify({ version: 1, reading: {}, practice: {}, sessions: { 'interview:all:all': 'java-oop-pillars:Saved question on another page' }, preferences: { fontSize: 18 } })))
  await page.goto(`${origin}/interview/all`)
  await page.getByText(/saved question is not among/).waitFor()
  await page.getByRole('button', { name: 'Start from the first question' }).click()
  await page.locator('.practice-question').waitFor()

  await page.evaluate(() => localStorage.removeItem('cs-fundamentals-learning-v1'))
  await page.goto(`${origin}/topic/java-oop-pillars`)
  await page.getByRole('tab', { name: 'Practice' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await page.locator('.interview-answer').waitFor()
  if ((await page.locator('.interview-answer').innerText()).includes('Answer rubric')) failures.push('Pilot rubric leaked into the immediate model answer')
  await page.getByText('Answer checklist and follow-up').click()
  try {
    await page.locator('.practice-guidance code').first().waitFor({ timeout: 5_000 })
    await page.getByText('What changes if the invoked method is static or private?').waitFor({ timeout: 5_000 })
  } catch {
    failures.push(`Pilot rubric did not render its inline code and follow-up: ${await page.locator('.practice-guidance').innerText()}`)
  }

  await page.getByRole('textbox').fill('A subtype implementation is selected for the actual receiver.')
  await page.getByRole('button', { name: 'Partly recalled' }).click()
  await page.getByRole('button', { name: 'Record this attempt' }).click()
  await page.getByText('Review date and previous attempts').click()
  await page.getByText('Reset review date to now').click()
  await page.goto(`${origin}/progress`)
  await page.getByRole('link', { name: 'Start a review session' }).click()
  await page.getByRole('heading', { name: 'Explain and compare' }).waitFor()
  if (!(await page.getByRole('textbox').inputValue()).includes('actual receiver')) failures.push('Review did not restore the exact saved explanation')
  await page.getByRole('button', { name: 'Recalled confidently' }).click()
  await page.getByRole('button', { name: 'Record this attempt' }).click()
  await page.getByText('1 of 1 questions recorded in this session.').waitFor()
  await page.getByText('Review date and previous attempts').click()
  await page.getByText('Model answer not opened during this visit', { exact: false }).waitFor()

  // Reader density (October 5 targets): standard 18px text, Topics and Reading options closed.
  for (const [width, limit] of [[1440, 330], [375, 450]]) {
    await page.setViewportSize({ width, height: 960 })
    await page.evaluate(() => localStorage.removeItem('cs-fundamentals-learning-v1'))
    await page.goto(`${origin}/topic/java-execution-pipeline`)
    await page.locator('.topic-content h2').first().waitFor()
    const top = await page.locator('.topic-content').evaluate(element => Math.round(element.getBoundingClientRect().top + window.scrollY))
    if (top > limit) failures.push(`Reader article starts at ${top}px at ${width}px (target ${limit}px)`)
    const fontSize = await page.locator('.topic-content p').first().evaluate(element => getComputedStyle(element).fontSize)
    if (fontSize !== '18px') failures.push(`Standard prose renders at ${fontSize}, not the 18px reader preference`)
  }

  // Category rail: search another lesson's heading, open it in Study, then clear search and confirm
  // the earlier expansion choices return; Collapse all survives a view change.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${origin}/topic/process-management?view=practice&question=x&source=course`)
  const rail = page.getByRole('navigation', { name: 'Operating Systems topics' })
  await rail.locator('.category-topic-item').first().waitFor()
  await rail.getByRole('button', { name: 'Expand CPU Scheduling' }).click()
  const railSearch = rail.getByRole('searchbox', { name: /find a lesson or section/i })
  await railSearch.fill('round robin')
  const match = rail.locator('.category-topic-sections--matches a').first()
  await match.waitFor()
  const matchHash = new URL(await match.getAttribute('href'), origin).hash
  await match.click()
  await page.waitForURL(url => url.hash === matchHash && !url.searchParams.has('view') && !url.searchParams.has('question') && url.searchParams.get('source') === 'course')
  // A result in another lesson remounts the page after the URL changes; wait for the settled tab state.
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Study'), null, { timeout: 10_000 })
    .catch(() => failures.push('Rail search result did not open Study'))
  await page.waitForFunction(hash => document.getElementById(hash.slice(1)) !== null, matchHash)
  if ((await page.getByRole('navigation', { name: 'Operating Systems topics' }).getByRole('searchbox').inputValue()) !== 'round robin') failures.push('Rail query was lost after opening a result')
  await page.getByRole('navigation', { name: 'Operating Systems topics' }).getByRole('button', { name: 'Clear search' }).click()
  for (const [title, expected] of [['Process Management', 'true'], ['CPU Scheduling', 'true'], ['Deadlocks', 'false']]) {
    const expanded = await page.getByRole('navigation', { name: 'Operating Systems topics' }).locator('.category-topic-row', { has: page.locator(`a.category-topic-link:text-is("${title}")`) }).locator('button').getAttribute('aria-expanded')
    if (expanded !== expected) failures.push(`Clearing rail search changed ${title} expansion to ${expanded}`)
  }
  await page.getByRole('navigation', { name: 'Operating Systems topics' }).getByRole('button', { name: 'Collapse all' }).click()
  await page.getByRole('tab', { name: 'Practice' }).click()
  await page.getByRole('tab', { name: 'Study' }).click()
  if (await page.getByRole('navigation', { name: 'Operating Systems topics' }).locator('.category-topic-toggle[aria-expanded="true"]').count() !== 0) failures.push('Collapse all was undone by a view change')
  await page.goBack()
  await page.goBack()
  await page.waitForURL(url => url.hash === matchHash)

  // Every registered simulator: no page overflow at 320px, and no axe findings in either theme.
  const registrySource = fs.readFileSync(path.join(repoRoot, 'frontend/src/components/visualizers/topicVisualizerRegistry.jsx'), 'utf8')
  const simulatorIds = [...registrySource.matchAll(/^\s+'?([a-z0-9-]+)'?: (?:direct|hub)\(/gm)].map(match => match[1])
  simulatorCount = simulatorIds.length
  if (simulatorIds.length < 30) failures.push(`Registry parse found only ${simulatorIds.length} simulators`)
  const simulatorAxe = require('axe-core').source
  for (const theme of ['dark', 'light']) {
    await page.evaluate(selectedTheme => localStorage.setItem('cs-fundamentals-theme', selectedTheme), theme)
    for (const id of simulatorIds) {
      await page.setViewportSize({ width: theme === 'light' ? 320 : 1280, height: 900 })
      await page.goto(`${origin}/topic/${id}?view=simulation`)
      await page.locator('h1').first().waitFor()
      await page.locator(`html[data-theme="${theme}"]`).waitFor()
      await page.waitForFunction(() => !document.body.innerText.includes('Loading visualizer'), null, { timeout: 15_000 })
      await page.waitForTimeout(600)
      if (theme === 'light') {
        const width = await page.evaluate(() => document.documentElement.scrollWidth)
        if (width > 321) failures.push(`${id} simulation overflows at 320px (${width}px)`)
      }
      await page.addScriptTag({ content: simulatorAxe })
      const findings = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => `${item.id} at ${item.nodes[0]?.target.join(' ')}`))
      for (const finding of findings) failures.push(`${theme} ${id} simulation: accessibility ${finding}`)
    }
  }

  const axeSource = require('axe-core').source
  for (const theme of ['dark', 'light']) {
    await page.evaluate(selectedTheme => localStorage.setItem('cs-fundamentals-theme', selectedTheme), theme)
    for (const route of ['/', '/category/java-spring', '/topic/java-execution-pipeline', '/topic/process-management?view=simulation', '/topic/java-hashmap-internals?view=simulation', '/topic/dbms-indexing?view=simulation', '/search?q=java', '/interview/all', '/progress', '/review']) {
      await page.goto(`${origin}${route}`)
      await page.locator('h1').first().waitFor()
      await page.locator(`html[data-theme="${theme}"]`).waitFor()
      if (route.startsWith('/topic/') && !route.includes('view=simulation')) await page.locator('.topic-content h2').first().waitFor()
      if (route.includes('process-management?view=simulation')) await page.locator('.action-buttons-grid .btn-action').first().waitFor()
      if (route.includes('java-hashmap-internals?view=simulation')) await page.getByRole('textbox', { name: 'Map key' }).waitFor()
      if (route.includes('dbms-indexing?view=simulation')) await page.getByRole('combobox', { name: 'Tree order' }).waitFor()
      await page.addScriptTag({ content: axeSource })
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
        return result.violations.map(item => ({
          id: item.id,
          targets: item.nodes.map(node => `${node.target.join(' ')} ${node.any.map(check => JSON.stringify(check.data)).join(' ')}`)
        }))
      })
      for (const violation of violations) failures.push(`${theme} ${route}: accessibility ${violation.id} at ${violation.targets.join(', ')}`)
    }
  }
} catch (error) {
  // Report everything gathered before the aborted journey instead of losing it with the stack trace.
  failures.push(`journey aborted: ${String(error?.message || error).split('\n')[0]}`)
} finally {
  await browser.close()
  await server.close()
}

if (failures.length > 0) {
  console.error(`Responsive layout smoke failed (${failures.length} issue(s)):`)
  failures.forEach(failure => console.error(` - ${failure}`))
  process.exit(1)
}

console.log(`Responsive layout smoke passed: 14 routes × 5 widths × 2 themes; reader density; rail search/collapse journey; ${simulatorCount} simulators × 2 themes (320px overflow + axe); 20 page axe scans; six-category navigation and exact-question spaced-review journeys.`)
