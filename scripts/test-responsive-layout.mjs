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

try {
  const page = await browser.newPage()
  page.on('pageerror', error => failures.push(`page error: ${error.message}`))
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/topics') {
      await route.fulfill({ json: [] })
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

  const routes = [
    '/',
    '/topic/java-execution-pipeline',
    '/topic/process-management',
    '/topic/application-layer',
    '/topic/embeddings-vector-db',
    '/search?q=java',
    '/interview/all',
    '/not-a-real-route'
  ]
  const widths = [320, 375, 768, 1024, 1440]

  for (const theme of ['dark', 'light']) {
    await page.addInitScript(selectedTheme => localStorage.setItem('cs-fundamentals-theme', selectedTheme), theme)
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of routes) {
        await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' })
        await page.locator('h1').first().waitFor({ timeout: 15_000 })
        if (route.startsWith('/topic/')) await page.locator('.topic-content h2').first().waitFor({ timeout: 15_000 })
        const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
        if (dimensions.document > dimensions.viewport + 1) {
          failures.push(`${theme} ${width}px ${route}: document width ${dimensions.document}px`)
        }
      }
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

console.log('Responsive layout smoke passed: 8 route families × 5 widths × 2 themes.')
