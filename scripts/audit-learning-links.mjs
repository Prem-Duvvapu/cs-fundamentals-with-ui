#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'frontend/package.json'))
export const inventoryFile = 'BACKEND_ENGINEERING_COVERAGE_2026-10-17.md'
export const hosts = { dsa: 'dsa-with-ui.vercel.app', lld: 'lld-with-ui.vercel.app', hld: 'hld-with-ui.vercel.app' }
// Verification metadata keyed by the existing Markdown references; URLs live only there.
export const identities = {
  dsa: { owner: 'dsa', landing: true }, lld: { owner: 'lld', landing: true }, hld: { owner: 'hld', landing: true },
  dsatwosum: { owner: 'dsa', id: 'two-sum', title: 'Two Sum' },
  dsabfs: { owner: 'dsa', id: 'bfs-traversal', title: 'BFS Traversal of Graph' },
  lldlogging: { owner: 'lld', id: 'logging-framework', title: 'Logging Framework' },
  lldworkflow: { owner: 'lld', id: 'workflow', title: 'Workflow / Approval Engine' },
  lldcache: { owner: 'lld', id: 'lru-cache', title: 'LRU Cache System' },
  lldcachelibrary: { owner: 'lld', id: 'cachelibrary', title: 'Generic Cache Library' },
  lldpool: { owner: 'lld', id: 'thread-pool', title: 'Thread Pool' },
  lldpubsub: { owner: 'lld', id: 'pub-sub', title: 'Pub/Sub System (Message Broker)' },
  lldbreaker: { owner: 'lld', id: 'circuit-breaker', title: 'Circuit Breaker' },
  lldpayment: { owner: 'lld', id: 'payment', title: 'Payment Gateway' },
  lldrate: { owner: 'lld', id: 'rate-limiter', title: 'Rate Limiter' },
  hldflow: { owner: 'hld', id: 'request-flow', title: 'Request Flow & Load Balancing' },
  hldcapacity: { owner: 'hld', id: 'capacity-estimation', title: 'Capacity Estimation' },
  hldrate: { owner: 'hld', id: 'distributed-rate-limiter', title: 'Distributed Rate Limiter' },
  hldcache: { owner: 'hld', id: 'cache-aside', title: 'Cache-Aside' },
}

export class AuditFailure extends Error {
  constructor(kind, code) { super(code); this.kind = kind; this.code = code }
}
const confirmed = code => new AuditFailure('confirmed', code)
const transient = code => new AuditFailure('transient', code)
export const normalize = text => text.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase()

export function validateUrl(value, expectedHost, { loopback = false } = {}) {
  let url
  try { url = new URL(value) } catch { throw confirmed('invalid-url') }
  const local = loopback && url.protocol === 'http:' && url.hostname === '127.0.0.1'
  if ((!local && url.protocol !== 'https:') || url.host !== expectedHost || url.username || url.password || url.search || url.hash) throw confirmed('destination-policy')
  let pathname
  try { pathname = decodeURIComponent(url.pathname) } catch { throw confirmed('invalid-url-path') }
  if (pathname.split('/').some(segment => ['draft', 'drafts'].includes(segment.toLowerCase()))) throw confirmed('draft-destination')
  return url
}

export function readInventory(markdown) {
  const entries = new Map()
  for (const match of markdown.matchAll(/^\[([^\]]+)\]:\s*(https?:\/\/\S+)\s*$/gm)) {
    const [, reference, url] = match
    if (entries.has(reference)) throw confirmed('duplicate-reference')
    entries.set(reference, url)
  }
  const siblingEntries = [...entries].filter(([, url]) => {
    try { return Object.values(hosts).includes(new URL(url).hostname) } catch { return false }
  })
  // A host rename or a newly added deep link must receive an explicit reviewed identity contract.
  for (const [reference] of siblingEntries) if (!identities[reference]) throw confirmed('untracked-sibling-reference')
  return Object.entries(identities).map(([reference, identity]) => {
    const url = entries.get(reference)
    if (!url) throw confirmed('missing-reference')
    validateUrl(url, hosts[identity.owner])
    return { reference, url, ...identity }
  })
}

export async function fetchBounded(value, expectedHost, options = {}) {
  const { timeoutMs = 12000, maxBytes = 4 * 1024 * 1024, attempts = 2, retryMs = 400, loopback = false } = options
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 2) throw new Error('attempts must be 1 or 2')
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let url = validateUrl(value, expectedHost, { loopback })
      let redirects = 0
      for (;;) {
        const response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'CS-Learning-Link-Audit/1.0', Accept: 'text/html, application/json' } })
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel()
          if (++redirects > 3) throw confirmed('redirect-limit')
          const location = response.headers.get('location')
          if (!location) throw confirmed('redirect-without-location')
          let target
          try { target = new URL(location, url).href } catch { throw confirmed('invalid-redirect-location') }
          url = validateUrl(target, expectedHost, { loopback })
          continue
        }
        if (response.status >= 500 || [408, 425, 429].includes(response.status)) { await response.body?.cancel(); throw transient(`http-${response.status}`) }
        if ([401, 403].includes(response.status)) { await response.body?.cancel(); throw transient(`access-blocked-${response.status}`) }
        if (response.status !== 200) { await response.body?.cancel(); throw confirmed(`http-${response.status}`) }
        const chunks = []; let bytes = 0
        for await (const chunk of response.body ?? []) {
          bytes += chunk.byteLength
          if (bytes > maxBytes) { controller.abort(); throw confirmed('body-limit') }
          chunks.push(chunk)
        }
        return { url: url.href, status: response.status, redirects, body: Buffer.concat(chunks).toString('utf8'), contentType: response.headers.get('content-type') ?? '' }
      }
    } catch (error) {
      const failure = error instanceof AuditFailure ? error : transient(controller.signal.aborted ? 'request-deadline' : 'network-error')
      if (failure.kind !== 'transient' || attempt + 1 === attempts) throw failure
      await new Promise(resolve => setTimeout(resolve, retryMs))
    } finally { clearTimeout(timer) }
  }
}

export function parseCatalog(response) {
  if (!response.contentType.includes('json')) throw confirmed('catalog-spa-fallback')
  let data
  try { data = JSON.parse(response.body) } catch { throw confirmed('invalid-catalog-json') }
  if (!Array.isArray(data)) throw confirmed('invalid-catalog-shape')
  return data
}

export function checkCatalog(entries, identity) {
  const found = entries.filter(entry => entry.id === identity.id)
  if (found.length !== 1) throw confirmed(found.length ? 'duplicate-stable-id' : 'removed-stable-id')
  const entry = found[0]
  if (entry.status && entry.status !== 'published') throw confirmed('unpublished-stable-id')
  if (normalize(entry.title ?? '') !== normalize(identity.title)) throw confirmed('catalog-identity-mismatch')
}

export function checkHeadings(headings, identity, finalUrl, expectedHost, options = {}) {
  const final = validateUrl(finalUrl, expectedHost, options)
  if (!identity.landing && final.pathname === '/') throw confirmed('homepage-fallback')
  if (!headings.some(heading => normalize(heading) === normalize(identity.title))) throw confirmed('rendered-identity-mismatch')
}

async function inspectRenderedOnce(browser, identity, options = {}) {
  const { timeoutMs = 20000, headingTimeoutMs = timeoutMs, loopback = false } = options
  const expectedHost = loopback ? new URL(identity.url).host : hosts[identity.owner]
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false })
  const page = await context.newPage()
  const blocked = []; const upstream = []; let count = 0
  const session = await context.newCDPSession(page)
  const { frameTree } = await session.send('Page.getFrameTree')
  // Fetch interception pauses every redirect hop; route.continue alone does not provide this boundary.
  await session.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
  session.on('Fetch.requestPaused', async event => {
    const { request, requestId, resourceType, frameId } = event
    let allowed = false
    try {
      const url = new URL(request.url)
      allowed = ++count <= 100 && ['GET', 'HEAD'].includes(request.method) && url.host === expectedHost && (loopback || url.protocol === 'https:')
    } catch { /* Invalid requests are denied. */ }
    if (!allowed && resourceType === 'Document' && frameId === frameTree.frame.id) blocked.push('navigation-policy')
    try { await session.send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', allowed ? { requestId } : { requestId, errorReason: 'BlockedByClient' }) }
    catch { /* Closing the owned context can cancel an intercepted request. */ }
  })
  page.on('response', response => { if (response.status() >= 500 || response.status() === 429) upstream.push(response.status()) })
  page.on('requestfailed', request => { if (request.url().includes('/api/')) upstream.push('api-network') })
  try {
    const navigation = await page.goto(identity.url, { timeout: timeoutMs, waitUntil: 'domcontentloaded' })
    if (navigation && navigation.status() !== 200) {
      const status = navigation.status()
      throw status >= 500 || [401, 403, 408, 425, 429].includes(status) ? transient(`render-http-${status}`) : confirmed(`render-http-${status}`)
    }
    try {
      await page.waitForFunction(title => [...document.querySelectorAll('h1')].some(h => {
        const normalize = value => value.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase()
        return h.getClientRects().length && normalize(h.textContent ?? '') === normalize(title)
      }), identity.title, { timeout: headingTimeoutMs })
    } catch {
      if (blocked.length) throw confirmed('navigation-policy')
      if (upstream.length) throw transient('render-upstream-unavailable')
      const text = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '')
      const headings = await page.locator('h1:visible').allTextContents()
      if (/response is incompatible with this app|update the frontend and backend together/i.test(text)) throw confirmed('render-contract-incompatible')
      if ((!headings.length || headings.every(h => /^(loading|error|unavailable)/i.test(h.trim()))) && /could not load|unable to load|failed to fetch|try again|retry|loading/i.test(text) && !/not found|does not exist/i.test(text)) throw transient('render-unavailable')
      throw confirmed('rendered-identity-mismatch')
    }
    if (blocked.length) throw confirmed('navigation-policy')
    checkHeadings(await page.locator('h1:visible').allTextContents(), identity, page.url(), expectedHost, { loopback })
    return { finalUrl: page.url(), identity: 'rendered-h1' }
  } catch (error) {
    if (error instanceof AuditFailure) throw error
    if (blocked.length) throw confirmed('navigation-policy')
    throw transient('browser-navigation-unavailable')
  } finally { await context.close() }
}

export async function inspectRendered(browser, identity, options = {}) {
  const { attempts = 2, retryMs = 2000 } = options
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 2) throw new Error('attempts must be 1 or 2')
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await inspectRenderedOnce(browser, identity, options) }
    catch (error) {
      if (!(error instanceof AuditFailure) || error.kind !== 'transient' || attempt + 1 === attempts) throw error
      await new Promise(resolve => setTimeout(resolve, retryMs))
    }
  }
}

export async function runAudit({ reportPath = path.join(root, 'learning-link-report.json'), browser } = {}) {
  const inventory = readInventory(await fs.readFile(path.join(root, inventoryFile), 'utf8'))
  const results = []; const catalogs = new Map()
  const checkedAt = new Date().toISOString(); const deadline = Date.now() + 10 * 60 * 1000
  const checkpoint = async state => {
    const temporary = reportPath + '.tmp'
    await fs.writeFile(temporary, JSON.stringify({ version: 1, checkedAt, state, inventory: inventoryFile, results }, null, 2) + '\n')
    await fs.rename(temporary, reportPath)
  }
  await checkpoint('running')
  for (const owner of ['dsa', 'hld']) {
    const api = owner === 'dsa' ? '/api/problems' : '/api/v1/topics'
    try { catalogs.set(owner, parseCatalog(await fetchBounded(`https://${hosts[owner]}${api}`, hosts[owner]))) }
    catch (error) { catalogs.set(owner, error) }
  }
  for (const identity of inventory) {
    const result = { reference: identity.reference, stableId: identity.id ?? null, owner: identity.owner }
    try {
      if (Date.now() >= deadline) throw transient('audit-budget-exhausted')
      const http = await fetchBounded(identity.url, hosts[identity.owner])
      result.httpStatus = http.status; result.redirects = http.redirects; result.finalUrl = http.url
      if (identity.landing) result.evidence = 'landing-availability-only'
      else {
        if (catalogs.has(identity.owner)) {
          const catalog = catalogs.get(identity.owner)
          if (catalog instanceof Error) throw catalog
          checkCatalog(catalog, identity)
        }
        const rendered = await inspectRendered(browser, identity)
        result.finalUrl = rendered.finalUrl
        result.evidence = catalogs.has(identity.owner) ? 'published-catalog-and-rendered-h1' : 'rendered-h1-source-reviewed-module'
      }
      result.status = 'verified'
    } catch (error) {
      result.status = error instanceof AuditFailure ? error.kind : 'transient'
      result.code = error instanceof AuditFailure ? error.code : 'audit-internal-error'
    }
    results.push(result)
    await checkpoint('running')
    console.log(`${result.reference}: ${result.status}${result.code ? ` (${result.code})` : ''}`)
  }
  await checkpoint('complete')
  return results.some(result => result.status === 'confirmed') ? 1 : results.some(result => result.status === 'transient') ? 2 : 0
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--inventory-only')) {
    const inventory = readInventory(await fs.readFile(path.join(root, inventoryFile), 'utf8'))
    console.log(`Validated ${inventory.length} sibling references from ${inventoryFile}`)
    return
  }
  const reportIndex = args.indexOf('--report')
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try { process.exitCode = await runAudit({ browser, reportPath: reportIndex >= 0 ? path.resolve(args[reportIndex + 1]) : undefined }) }
  finally { await browser.close() }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.code ?? error.message); process.exitCode = 1 })
