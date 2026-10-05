#!/usr/bin/env node
// Real-backend browser journey: the built frontend talks to a running Spring Boot API (no fixtures).
// Usage: start the backend (for example `java -jar backend/target/*.jar`), build the frontend, then
//   CS_API_ORIGIN=http://127.0.0.1:9190 node scripts/test-real-backend-journey.mjs
import { launchChromium, startStaticServer } from './lib/ui-fixtures.mjs'

const apiOrigin = process.env.CS_API_ORIGIN
if (!apiOrigin) {
  console.error('Set CS_API_ORIGIN to a running backend, for example http://127.0.0.1:9190')
  process.exit(2)
}
const catalog = await fetch(`${apiOrigin}/api/v1/topics`).then(response => response.json()).catch(() => null)
if (!Array.isArray(catalog)) {
  console.error(`No catalog at ${apiOrigin}/api/v1/topics; is the backend running?`)
  process.exit(2)
}

const server = await startStaticServer({ apiOrigin })
const browser = await launchChromium()
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', error => failures.push(`page error: ${error.message}`))
  const origin = server.origin

  await page.goto(origin)
  await page.getByRole('heading', { level: 1, name: /Understand the systems/ }).waitFor()
  await page.getByText(`${catalog.length} lessons on the fundamentals`).waitFor({ timeout: 20_000 }).catch(() => failures.push('Home did not report the real catalog size'))

  const java = catalog.filter(topic => topic.category === 'java-spring').sort((a, b) => a.order - b.order)
  await page.goto(`${origin}/category/java-spring`)
  await page.getByRole('list', { name: 'Java & Spring lessons' }).waitFor()
  check(await page.locator('.lesson-row').count() === java.length, 'Category page lesson count differs from the backend catalog')

  await page.goto(`${origin}/topic/${java[0].id}`)
  await page.locator('.topic-content h2').first().waitFor()
  const rail = page.getByRole('navigation', { name: 'Java & Spring topics' })
  await page.waitForFunction(() => !document.body.innerText.includes('Loading subtopics…'), null, { timeout: 20_000 })
  check(await rail.getByRole('button', { name: 'Retry subtopics' }).count() === 0, 'Real outline request failed')
  await rail.getByRole('button', { name: `Expand ${java[1].title}` }).click()
  const section = rail.locator('.category-topic-item').nth(1).locator('.category-topic-sections a').nth(2)
  const hash = new URL(await section.getAttribute('href'), origin).hash
  await section.click()
  await page.waitForURL(url => url.pathname === `/topic/${java[1].id}` && url.hash === hash)
  await page.waitForFunction(id => document.getElementById(id) !== null, hash.slice(1), { timeout: 20_000 })
  const visible = await page.evaluate(id => { const top = document.getElementById(id).getBoundingClientRect().top; return top >= 0 && top < window.innerHeight }, hash.slice(1))
  check(visible, `Real outline anchor ${hash} did not scroll into view`)

  await page.goto(`${origin}/search?q=${encodeURIComponent('round robin')}`)
  const result = page.locator('.search-result-title a').first()
  await result.waitFor({ timeout: 20_000 })
  await result.click()
  await page.waitForURL(url => url.pathname.startsWith('/topic/'))
  await page.locator('.topic-content h2').first().waitFor()

  await page.goto(`${origin}/interview/os`)
  await page.locator('.practice-question').waitFor({ timeout: 20_000 })

  const scheduling = page.waitForResponse(response => response.url().endsWith('/api/v1/simulation/cpu-scheduling'), { timeout: 20_000 })
  await page.goto(`${origin}/topic/cpu-scheduling?view=simulation`)
  check((await scheduling).status() === 200, 'Server-side CPU scheduling simulation did not respond with 200')
  await page.locator('.viz-table tbody tr').first().waitFor({ timeout: 20_000 })

  await page.goto(`${origin}/topic/not-a-registered-topic`)
  await page.getByRole('heading', { name: 'Topic not found' }).waitFor()
} catch (error) {
  failures.push(`journey aborted: ${String(error?.message || error).split('\n')[0]}`)
} finally {
  await browser.close()
  await server.close()
}

if (failures.length) {
  console.error(`Real-backend journey failed (${failures.length}):`)
  failures.forEach(failure => console.error(` - ${failure}`))
  process.exit(1)
}
console.log(`Real-backend journey passed against ${apiOrigin}: catalog (${catalog.length} lessons), category, real outlines and anchors, search, interview, server-side CPU simulation, missing topic.`)
