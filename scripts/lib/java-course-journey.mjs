// Presentation and native-keyboard evidence with the canonical API fixtures; no learner claim.
export async function verifyJavaCourseRevision(page, origin, failures) {
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => localStorage.setItem('cs-fundamentals-theme', value), theme)
    for (const width of [320, 375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${origin}/category/java-spring`)
      const revision = page.locator('.course-revision')
      const summary = revision.locator('summary')
      await summary.waitFor()
      await page.locator(`html[data-theme="${theme}"]`).waitFor()
      if (await revision.evaluate(element => element.open)) failures.push(`${theme} ${width}px: Java revision opened without opting in`)
      await summary.focus()
      await page.keyboard.press('Tab')
      if (await revision.locator('.course-revision-body').evaluate(element => element.contains(document.activeElement))) failures.push(`${theme} ${width}px: closed revision links received keyboard focus`)
      await summary.focus()
      await page.keyboard.press('Enter')
      await revision.getByRole('heading', { name: 'Two familiar lessons' }).waitFor()
      const hrefs = await revision.locator('.lesson-row-title a').evaluateAll(links => links.map(link => link.getAttribute('href')))
      if (hrefs.join(',') !== '/topic/java-oop-pillars,/topic/java-execution-pipeline') failures.push('Java revision did not preserve the reviewed course order')
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) failures.push(`${theme} ${width}px: open Java revision overflowed`)
      const targets = width < 768 ? 'summary, .course-revision-links a, .bookmark-toggle-icon' : 'summary, .course-revision-links a'
      const undersized = await revision.locator(targets).evaluateAll(elements => elements.some(element => element.getBoundingClientRect().height < 44))
      if (undersized) failures.push(`${theme} ${width}px: Java revision target shorter than 44px`)
      await summary.focus()
      await page.keyboard.press('Space')
      if (await revision.evaluate(element => element.open)) failures.push(`${theme} ${width}px: Java revision did not close with Space`)
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${origin}/topic/java-oop-pillars?view=practice`)
  const draft = 'An account protects valid state through deposit and withdraw operations.'
  await page.getByRole('textbox').fill(draft)
  await page.waitForFunction(value => Object.values(JSON.parse(localStorage.getItem('cs-fundamentals-learning-v1') || '{}').practice || {}).some(entry => entry.draft === value), draft)
  const savedPractice = await page.evaluate(() => JSON.parse(localStorage.getItem('cs-fundamentals-learning-v1')).practice)
  await page.evaluate(() => localStorage.setItem('cs-fundamentals-progress', JSON.stringify({ 'java-oop-pillars': { bookmarked: false, completed: true } })))
  await page.goto(`${origin}/category/java-spring`)
  let revision = page.locator('.course-revision')
  await revision.locator('summary').click()
  const oopRow = revision.locator('.lesson-row').first()
  await oopRow.getByText('Completed', { exact: true }).waitFor()
  await oopRow.getByRole('button', { name: /^Bookmark / }).click()
  const canonical = page.locator('.category-page-view > .lesson-rows')
  const canonicalOop = canonical.locator('.lesson-row').filter({ has: page.locator('.lesson-row-title a[href="/topic/java-oop-pillars"]') })
  if (await canonicalOop.getByRole('button', { name: /from bookmarks$/ }).getAttribute('aria-pressed') !== 'true') failures.push('Revision bookmark did not update canonical lesson')
  await canonicalOop.getByRole('button', { name: /from bookmarks$/ }).click()
  if (await oopRow.getByRole('button', { name: /^Bookmark / }).getAttribute('aria-pressed') !== 'false') failures.push('Canonical bookmark did not update revision lesson')

  for (const name of ['Run an account class', 'Understand interpretation and JIT']) {
    revision = page.locator('.course-revision')
    if (!(await revision.evaluate(element => element.open))) await revision.locator('summary').click()
    const link = revision.getByRole('link', { name, exact: true })
    const target = new URL(await link.getAttribute('href'), origin)
    await link.click()
    await page.waitForURL(url => url.pathname === target.pathname && url.hash === target.hash)
    await page.waitForFunction(hash => document.getElementById(hash.slice(1)) !== null, target.hash)
    await page.waitForFunction(hash => {
      const bounds = document.getElementById(hash.slice(1)).getBoundingClientRect()
      return bounds.top >= 0 && bounds.top < innerHeight
    }, target.hash)
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/category/java-spring')
    await page.goForward()
    await page.waitForURL(url => url.pathname === target.pathname && url.hash === target.hash)
    await page.waitForFunction(hash => document.getElementById(hash.slice(1)) !== null, target.hash)
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/category/java-spring')
  }

  revision = page.locator('.course-revision')
  if (!(await revision.evaluate(element => element.open))) await revision.locator('summary').click()
  await revision.getByRole('link', { name: 'Practice: OOP pillars', exact: true }).click()
  await page.getByRole('textbox').waitFor()
  if (await page.getByRole('textbox').inputValue() !== draft) failures.push('Revision practice lost the canonical saved draft')
  const practice = await page.evaluate(() => JSON.parse(localStorage.getItem('cs-fundamentals-learning-v1')).practice)
  if (JSON.stringify(practice) !== JSON.stringify(savedPractice)) failures.push('Revision navigation changed practice identities or saved data')
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('cs-fundamentals-progress'))['java-oop-pillars'])
  if (progress.completed !== true || progress.bookmarked !== false) failures.push('Revision navigation changed canonical completion/bookmark state')
}
