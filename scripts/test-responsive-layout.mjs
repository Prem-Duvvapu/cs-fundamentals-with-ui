#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(repoRoot, 'frontend/dist')
const require = createRequire(path.join(repoRoot, 'frontend/package.json'))
const contentByKey = new Map()
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'frontend/src/test/catalog.json'), 'utf8'))
function headingMarkdown(markdown) {
  let fence = null
  const headings = []
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (fence) {
      const close = line.match(/^ {0,3}(`+|~+)[\t ]*$/)
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null
      continue
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) { fence = open[1]; continue }
    if (/^ {0,3}#{2,6}[\t ]+/.test(line)) headings.push(line)
  }
  return headings.join('\n\n')
}

for (const category of fs.readdirSync(path.join(repoRoot, 'content'))) {
  const categoryDir = path.join(repoRoot, 'content', category)
  if (!fs.statSync(categoryDir).isDirectory()) continue
  for (const filename of fs.readdirSync(categoryDir).filter(name => name.endsWith('.md'))) {
    const topicId = filename.replace(/^\d+[a-z]?-/, '').replace(/\.md$/, '')
    contentByKey.set(`${category}/${topicId}`, path.join(categoryDir, filename))
  }
}

const mimeTypes = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html' }
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requested = path.resolve(distDir, `.${pathname}`)
  const isAsset = path.extname(pathname) !== ''
  const target = requested.startsWith(distDir) && fs.existsSync(requested) && fs.statSync(requested).isFile()
    ? requested
    : isAsset ? null : path.join(distDir, 'index.html')
  if (!target) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream' })
  fs.createReadStream(target).pipe(response)
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
const { chromium } = playwright.default ?? playwright
const browser = await chromium.launch()
const failures = []
const screenshotDir = process.env.CS_SCREENSHOT_DIR
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true })

try {
  const page = await browser.newPage()
  page.on('pageerror', error => failures.push(`page error: ${error.message}`))
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/topics') {
      await route.fulfill({ json: JSON.parse(fs.readFileSync(path.join(repoRoot, 'frontend/src/test/catalog.json'), 'utf8')) })
      return
    }
    if (url.pathname === '/api/v1/topics/outlines') {
      if (process.env.CS_OUTLINE_API_ORIGIN) {
        const response = await fetch(`${process.env.CS_OUTLINE_API_ORIGIN}${url.pathname}${url.search}`)
        await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() })
        return
      }
      const category = url.searchParams.get('category')
      const entries = catalog.filter(topic => topic.category === category).map(topic => ({
        topicId: topic.id,
        headingsMarkdown: headingMarkdown(fs.readFileSync(contentByKey.get(`${category}/${topic.id}`), 'utf8'))
      }))
      await route.fulfill({ json: entries })
      return
    }
    const contentMatch = url.pathname.match(/^\/api\/v1\/content\/([^/]+)\/([^/]+)$/)
    if (contentMatch) {
      const file = contentByKey.get(`${contentMatch[1]}/${contentMatch[2]}`)
      await route.fulfill(file
        ? { status: 200, contentType: 'text/markdown', body: fs.readFileSync(file, 'utf-8') }
        : { status: 404, body: '' })
      return
    }
    if (url.pathname === '/api/v1/search') {
      await route.fulfill({ json: { query: 'java', category: null, total: 1, results: [{ topicId: 'java-oop-pillars', title: 'OOP Pillars & Dynamic Method Dispatch', category: 'java-spring', level: 'beginner', summary: 'Encapsulation, abstraction, inheritance, and polymorphism', matchedHeading: 'Polymorphism', excerpt: 'Dynamic dispatch selects the overridden method.' }] } })
      return
    }
    if (url.pathname === '/api/v1/interview/questions') {
      await route.fulfill({ json: { category: null, difficulty: null, total: 1, offset: 0, limit: 50, questions: [{ id: 'java-oop-pillars-q1', topicId: 'java-oop-pillars', topicTitle: 'OOP Pillars', category: 'java-spring', number: 1, question: 'Q1. What is polymorphism?', difficulty: 'easy', answerMarkdown: 'One interface can represent several concrete behaviors.' }] } })
      return
    }
    await route.fulfill({ status: 404, body: '' })
  })

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
          await toggle.click()
          if ((await toc.isVisible()) !== (width < 1024)) failures.push(`${theme} ${width}px ${route}: TOC toggle did not change visibility`)
          await toggle.click()
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
  await page.getByRole('link', { name: /All learning paths/ }).first().click()
  await page.waitForFunction(() => document.title.startsWith('Learning paths'))
  if (!(await page.locator('#main-content').evaluate(element => document.activeElement === element))) failures.push('Pathname navigation did not focus the main landmark')
  if ((await page.locator('#main-content').getAttribute('aria-label')) !== 'Learning paths') failures.push('Main landmark does not name the destination page')

  await page.goto(`${origin}/topic/java-execution-pipeline`)
  await page.locator('.topic-content h3').first().waitFor()
  await page.getByRole('button', { name: 'Wrap code' }).first().evaluate(element => element.click())
  if (await page.getByRole('button', { name: 'Wrap code' }).first().getAttribute('aria-pressed') !== 'true') failures.push('Code wrap did not turn on')
  await page.getByRole('button', { name: 'Focus reading' }).evaluate(element => element.click())
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
  await page.locator('.interview-question').waitFor()

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
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

if (failures.length > 0) {
  console.error(`Responsive layout smoke failed (${failures.length} issue(s)):`)
  failures.forEach(failure => console.error(` - ${failure}`))
  process.exit(1)
}

console.log('Responsive layout smoke passed: 13 route families × 5 widths × 2 themes; 16 axe scans; exact-question spaced-review journey.')
