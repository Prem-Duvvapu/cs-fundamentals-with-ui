// Shared browser-harness fixtures: a static server for the built frontend, plus API routes backed
// by the canonical catalog fixture and the real lesson Markdown. Anything using these fixtures is
// presentation evidence, not a real-backend check; set CS_OUTLINE_API_ORIGIN to proxy outlines.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const distDir = path.join(repoRoot, 'frontend/dist')
export const frontendRequire = createRequire(path.join(repoRoot, 'frontend/package.json'))
export const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'frontend/src/test/catalog.json'), 'utf8'))

const contentByKey = new Map()
for (const category of fs.readdirSync(path.join(repoRoot, 'content'))) {
  const categoryDir = path.join(repoRoot, 'content', category)
  if (!fs.statSync(categoryDir).isDirectory()) continue
  for (const filename of fs.readdirSync(categoryDir).filter(name => name.endsWith('.md'))) {
    const topicId = filename.replace(/^\d+[a-z]?-/, '').replace(/\.md$/, '')
    contentByKey.set(`${category}/${topicId}`, path.join(categoryDir, filename))
  }
}

export function headingMarkdown(markdown) {
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

export function lessonMarkdown(category, topicId) {
  const file = contentByKey.get(`${category}/${topicId}`)
  return file ? fs.readFileSync(file, 'utf-8') : null
}

const mimeTypes = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html', '.png': 'image/png' }

export async function startStaticServer() {
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
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) }
}

export async function launchChromium() {
  const playwright = await import(pathToFileURL(frontendRequire.resolve('playwright')).href)
  const { chromium } = playwright.default ?? playwright
  return chromium.launch()
}

// `overrides` maps a pathname to an async handler, letting a journey simulate failures or delays.
export async function routeFixtureApi(page, overrides = {}) {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (overrides[url.pathname] && await overrides[url.pathname](route, url) !== false) return
    if (url.pathname === '/api/v1/topics') {
      await route.fulfill({ json: catalog })
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
        headingsMarkdown: headingMarkdown(lessonMarkdown(category, topic.id))
      }))
      await route.fulfill({ json: entries })
      return
    }
    const contentMatch = url.pathname.match(/^\/api\/v1\/content\/([^/]+)\/([^/]+)$/)
    if (contentMatch) {
      const body = lessonMarkdown(contentMatch[1], contentMatch[2])
      await route.fulfill(body !== null ? { status: 200, contentType: 'text/markdown', body } : { status: 404, body: '' })
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
}
