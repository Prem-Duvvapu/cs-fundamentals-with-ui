import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { AuditFailure, checkCatalog, checkHeadings, fetchBounded, identities, inspectRendered, inventoryFile, parseCatalog, readInventory, validateUrl } from './audit-learning-links.mjs'

let server, origin, browser, outageCalls = 0
const failure = (kind, code) => error => error instanceof AuditFailure && error.kind === kind && error.code === code
before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/old') { res.writeHead(308, { Location: '/lesson' }).end(); return }
    if (req.url === '/evil') { res.writeHead(302, { Location: 'https://unrelated.example/lesson' }).end(); return }
    if (req.url === '/invalid-redirect') { res.writeHead(302, { Location: 'http://[' }).end(); return }
    if (req.url === '/client-evil') { res.end('<script>location.replace("https://unrelated.example/lesson")</script>'); return }
    if (req.url === '/loop') { res.writeHead(302, { Location: '/loop' }).end(); return }
    if (req.url === '/removed') { res.writeHead(404).end(); return }
    if (req.url === '/outage') { outageCalls++; res.writeHead(503).end(); return }
    if (req.url === '/large') { res.end('x'.repeat(2000)); return }
    if (req.url === '/slow') { req.on('close', () => res.destroy()); return }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (req.url === '/lesson') res.end('<h1>📝 Logging Framework</h1>')
    else if (req.url === '/other') res.end('<h1>Payment Gateway</h1>')
    else if (req.url === '/unavailable') res.end('<h1>Loading</h1><p>Could not load this lesson. Retry</p>')
    else if (req.url === '/incompatible') res.end('<p>This cache-aside response is incompatible with this app. Update the frontend and backend together.</p>')
    else if (req.url === '/hidden') res.end('<h1 hidden>Logging Framework</h1><h1>Catalog</h1>')
    else res.end('<h1>Catalog</h1>') // Deliberate SPA fallback, HTTP 200.
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
  const { chromium } = createRequire(new URL('../frontend/package.json', import.meta.url))('playwright')
  browser = await chromium.launch()
})
after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) })
const localFetch = path => fetchBounded(origin + path, new URL(origin).host, { loopback: true, timeoutMs: 3000, attempts: 1 })
const lesson = path => ({ ...identities.lldlogging, url: origin + path })

test('existing references are the sole URL inventory and all 18 receive contracts', async () => {
  const markdown = await readFile(new URL('../' + inventoryFile, import.meta.url), 'utf8')
  assert.equal(readInventory(markdown).length, 18)
  assert.throws(() => readInventory(markdown.replace(/^\[lldlogging\]:.*$/m, '')), failure('confirmed', 'missing-reference'))
  assert.throws(() => readInventory(markdown + '\n[newlesson]: https://lld-with-ui.vercel.app/new\n'), failure('confirmed', 'untracked-sibling-reference'))
  assert.throws(() => readInventory(markdown + '\n[lldlogging]: https://lld-with-ui.vercel.app/other\n'), failure('confirmed', 'duplicate-reference'))
})
test('HTTPS, expected host, credentials and draft policy reject unsafe destinations', () => {
  for (const value of ['http://lld-with-ui.vercel.app/lesson', 'https://lld-with-ui.vercel.app.evil.test/lesson', 'https://user:pass@lld-with-ui.vercel.app/lesson', 'https://lld-with-ui.vercel.app/lesson?answer=private']) {
    assert.throws(() => validateUrl(value, 'lld-with-ui.vercel.app'), failure('confirmed', 'destination-policy'))
  }
  for (const route of ['/draft/topics/lesson', '/%64raft/topics/lesson']) assert.throws(() => validateUrl('https://hld-with-ui.vercel.app' + route, 'hld-with-ui.vercel.app'), failure('confirmed', 'draft-destination'))
})
test('HTTP redirects follow the same host and bound loops', async () => {
  const result = await localFetch('/old')
  assert.equal(result.redirects, 1); assert.equal(new URL(result.url).pathname, '/lesson')
  await assert.rejects(localFetch('/evil'), failure('confirmed', 'destination-policy'))
  await assert.rejects(localFetch('/invalid-redirect'), failure('confirmed', 'invalid-redirect-location'))
  await assert.rejects(localFetch('/loop'), failure('confirmed', 'redirect-limit'))
})
test('removed routes differ from bounded, retried temporary outages', async () => {
  await assert.rejects(localFetch('/removed'), failure('confirmed', 'http-404'))
  await assert.rejects(fetchBounded(origin + '/outage', new URL(origin).host, { loopback: true, timeoutMs: 200, retryMs: 1 }), failure('transient', 'http-503'))
  assert.equal(outageCalls, 2)
  await assert.rejects(fetchBounded(origin + '/slow', new URL(origin).host, { loopback: true, timeoutMs: 100, attempts: 1 }), failure('transient', 'request-deadline'))
})
test('oversize body fails and HTML catalog fallback cannot masquerade as JSON', async () => {
  await assert.rejects(fetchBounded(origin + '/large', new URL(origin).host, { loopback: true, maxBytes: 100, attempts: 1 }), failure('confirmed', 'body-limit'))
  assert.throws(() => parseCatalog({ contentType: 'text/html', body: '<h1>Catalog</h1>' }), failure('confirmed', 'catalog-spa-fallback'))
  assert.throws(() => parseCatalog({ contentType: 'application/json', body: '{}' }), failure('confirmed', 'invalid-catalog-shape'))
})
test('catalog IDs distinguish published, missing, duplicate, draft and mismatched lessons', () => {
  const identity = identities.hldflow
  const valid = { id: identity.id, title: identity.title, status: 'published' }
  checkCatalog([valid], identity)
  assert.throws(() => checkCatalog([], identity), failure('confirmed', 'removed-stable-id'))
  assert.throws(() => checkCatalog([valid, valid], identity), failure('confirmed', 'duplicate-stable-id'))
  assert.throws(() => checkCatalog([{ ...valid, status: 'draft' }], identity), failure('confirmed', 'unpublished-stable-id'))
  assert.throws(() => checkCatalog([{ ...valid, title: 'An unrelated lesson' }], identity), failure('confirmed', 'catalog-identity-mismatch'))
})
test('rendered same-concept redirect succeeds, and repaired inventory reference succeeds', async () => {
  await inspectRendered(browser, lesson('/old'), { loopback: true, timeoutMs: 3000 })
  const markdown = await readFile(new URL('../' + inventoryFile, import.meta.url), 'utf8')
  const referenceAt = route => readInventory(markdown.replace(/^\[lldlogging\]:.*$/m, '[lldlogging]: https://lld-with-ui.vercel.app' + route)).find(entry => entry.reference === 'lldlogging')
  const broken = referenceAt('/other')
  await assert.rejects(inspectRendered(browser, { ...broken, url: origin + new URL(broken.url).pathname }, { loopback: true, timeoutMs: 3000, headingTimeoutMs: 150 }), failure('confirmed', 'rendered-identity-mismatch'))
  const repaired = referenceAt('/lesson')
  await inspectRendered(browser, { ...repaired, url: origin + new URL(repaired.url).pathname }, { loopback: true, timeoutMs: 3000 })
})
test('actual browser rejects a 200 SPA fallback and an unrelated rendered lesson', async () => {
  for (const path of ['/not-a-real-route', '/other', '/hidden']) {
    await assert.rejects(inspectRendered(browser, lesson(path), { loopback: true, timeoutMs: 3000, headingTimeoutMs: 150 }), failure('confirmed', 'rendered-identity-mismatch'))
  }
  assert.throws(() => checkHeadings(['Logging Framework'], lesson('/'), origin + '/', new URL(origin).host, { loopback: true }), failure('confirmed', 'homepage-fallback'))
})
test('browser blocks an off-host redirect without navigating to it', async () => {
  for (const route of ['/evil', '/client-evil']) await assert.rejects(inspectRendered(browser, lesson(route), { loopback: true, timeoutMs: 3000 }), failure('confirmed', 'navigation-policy'))
})
test('an explicitly incompatible frontend/backend contract is confirmed, not a temporary outage', async () => {
  await assert.rejects(inspectRendered(browser, lesson('/incompatible'), { loopback: true, timeoutMs: 3000, headingTimeoutMs: 150 }), failure('confirmed', 'render-contract-incompatible'))
})
test('browser loading/outage is inconclusive instead of confirmed content removal', async () => {
  await assert.rejects(inspectRendered(browser, lesson('/unavailable'), { loopback: true, timeoutMs: 3000, headingTimeoutMs: 150, retryMs: 1 }), failure('transient', 'render-unavailable'))
})
