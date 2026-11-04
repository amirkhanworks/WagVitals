const { test, expect } = require('@playwright/test');

const PAGES = [
  'index.html',
  'product.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  '404.html'
];

test.describe('WagVitals page health', () => {
  for (const path of PAGES) {
    test(path + ' loads with working brand assets and no horizontal overflow', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      const response = await page.goto(path, { waitUntil: 'networkidle' });
      expect(response, path + ' should return a response').not.toBeNull();
      expect(response.status(), path + ' should return HTTP 200').toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();

      const headerLogo = page.locator('.site-header .brand--header img');
      await expect(headerLogo).toBeVisible();
      const logoMetrics = await headerLogo.evaluate(img => ({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height
      }));
      expect(logoMetrics.complete, 'header logo should finish loading').toBe(true);
      expect(logoMetrics.naturalWidth, 'header logo should be a valid image').toBeGreaterThan(0);
      expect(logoMetrics.width, 'horizontal logo should not collapse to a tiny mark').toBeGreaterThan(120);
      expect(logoMetrics.height).toBeGreaterThanOrEqual(26);

      const footerLogo = page.locator('.site-footer .brand--footer img');
      await expect(footerLogo).toHaveAttribute('alt', 'WagVitals');
      await footerLogo.scrollIntoViewIfNeeded();
      await expect.poll(() => footerLogo.evaluate(img => img.complete)).toBe(true);
      const footerMetrics = await footerLogo.evaluate(img => ({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        height: img.getBoundingClientRect().height
      }));
      expect(footerMetrics.complete).toBe(true);
      expect(footerMetrics.naturalWidth).toBeGreaterThan(0);
      expect(footerMetrics.height).toBeGreaterThanOrEqual(64);

      const invalidLinks = await page.locator('a[href]').evaluateAll(anchors =>
        anchors.map(anchor => anchor.getAttribute('href')).filter(href =>
          !href || href.includes('{{') || href.startsWith('javascript:')
        )
      );
      expect(invalidLinks, 'anchors should not contain template placeholders').toEqual([]);

      const externalBlankLinks = await page.locator('a[target="_blank"]').evaluateAll(anchors =>
        anchors.filter(anchor => !/noopener/.test(anchor.rel) || !/noreferrer/.test(anchor.rel)).length
      );
      expect(externalBlankLinks, 'new-window links must use noopener noreferrer').toBe(0);

      for (const width of [320, 360, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth
        }));
        expect(
          Math.max(metrics.document, metrics.body),
          path + ' must not overflow horizontally at ' + width + 'px'
        ).toBeLessThanOrEqual(metrics.viewport + 1);
      }

      expect(pageErrors, 'page JavaScript should not throw').toEqual([]);
    });
  }
});

test('mobile menu survives repeated open/close and Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('index.html', { waitUntil: 'networkidle' });

  const toggle = page.locator('[data-menu-toggle]');
  const nav = page.locator('[data-site-nav]');

  for (let i = 0; i < 10; i++) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toHaveClass(/is-open/);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).not.toHaveClass(/is-open/);
  }
});

test('mobile navigation closes after selecting a page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await page.locator('[data-menu-toggle]').click();
  await page.locator('#primary-navigation a[href="product.html"]').click();
  await expect(page).toHaveURL(/product\.html$/);
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-site-nav]')).not.toHaveClass(/is-open/);
});

test('contact links are real and the unconfigured form never transmits visitor details', async ({ page }) => {
  const outboundPosts = [];
  page.on('request', request => {
    if (request.method() === 'POST') outboundPosts.push(request.url());
  });

  await page.goto('contact.html', { waitUntil: 'networkidle' });

  const directContact = page.locator('.contact-tiles');
  await expect(directContact.locator('a[href="https://wa.me/918446244214"]')).toBeVisible();
  await expect(directContact.locator('a[href="tel:+918446244214"]')).toBeVisible();
  await expect(directContact.locator('a[href="mailto:amirwagvitals@gmail.com"]')).toBeVisible();

  const form = page.locator('[data-waitlist-form]');
  await expect(form).toBeVisible();
  await expect(form).not.toHaveAttribute('action', /.+/);
  await expect(form.locator('[data-waitlist-submit]')).toHaveAttribute('type', 'button');

  await form.locator('[data-waitlist-submit]').click();
  await expect(page.locator('[data-error-for="name"]')).toHaveText('Please complete this field.');
  await expect(page.locator('#waitlist-name')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#waitlist-name').fill('QA Visitor');
  await page.locator('#waitlist-email').fill('not-an-email');
  await page.locator('#waitlist-city').selectOption('Mumbai');
  await page.locator('#waitlist-interest').selectOption('Joining the waitlist');
  await form.locator('[data-waitlist-submit]').click();
  await expect(page.locator('[data-error-for="email"]')).toHaveText('Please enter a valid email address.');

  await page.locator('#waitlist-email').fill('qa@example.com');
  await form.locator('[data-waitlist-submit]').click();
  await expect(page.locator('[data-form-feedback]')).toContainText('Your details have not been sent');
  expect(outboundPosts, 'form must not POST personal data to a placeholder endpoint').toEqual([]);
  await expect(page).not.toHaveURL(/qa@example\.com|QA%20Visitor/);
});

test('favicon and social image metadata are present on every page', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', /favicon\.svg\?v=3$/);
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute('href', /favicon-32\.png\?v=3$/);
    await expect(page.locator('link[rel="icon"][sizes="16x16"]')).toHaveAttribute('href', /favicon-16\.png\?v=3$/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon\.png\?v=3$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /assets\/img\/brand\/og-image\.png$/);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /assets\/img\/brand\/og-image\.png$/);
  }
});
