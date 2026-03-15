import { test, expect, Page } from '@playwright/test';

// ─── Shared setup ─────────────────────────────────────────────────────────────

/**
 * Inject a mock window.turnstile before each page load so the invisible
 * Turnstile widget resolves immediately without hitting Cloudflare.
 * execute() is what the WaitlistForm calls on submit — calling the callback
 * there mimics the real widget issuing a token.
 */
async function mockTurnstile(page: Page) {
  await page.addInitScript(() => {
    const callbacks: Record<string, { callback?: (t: string) => void }> = {};
    (window as Window & { turnstile?: unknown }).turnstile = {
      render(container: HTMLElement, options: { callback?: (t: string) => void }) {
        const id = 'mock-widget-id';
        callbacks[id] = options;
        return id;
      },
      execute(id: string) {
        setTimeout(() => callbacks[id]?.callback?.('fake-turnstile-token'), 10);
      },
      reset() {},
      remove(id: string) {
        delete callbacks[id];
      },
    };
  });
}

/** Route /api/waitlist to a configurable mock response. */
function mockWaitlistApi(page: Page, { success = true, error = '' } = {}) {
  return page.route('**/api/waitlist', async (route) => {
    await route.fulfill({
      status: success ? 200 : 400,
      contentType: 'application/json',
      body: JSON.stringify(
        success
          ? { success: true, message: "You're on the list!" }
          : { success: false, error: error || 'Invalid email address' }
      ),
    });
  });
}

// ─── Page-load & SEO ──────────────────────────────────────────────────────────

test.describe('page load', () => {
  test('H1 is visible on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('meta title is present', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WAGMI FIT/i);
  });

  test('meta description is present', async ({ page }) => {
    await page.goto('/');
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    // Allow Turnstile-related errors since we're blocking its script in tests
    const realErrors = errors.filter(
      (e) => !e.includes('turnstile') && !e.includes('challenges.cloudflare')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('no 404s for page assets', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 404) failed.push(res.url());
    });
    await page.goto('/');
    // Give lazy assets a moment to load
    await page.waitForLoadState('networkidle');
    expect(failed).toHaveLength(0);
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('"Features" nav link scrolls to features section', async ({ page }) => {
    await page.getByRole('link', { name: /features/i }).first().click();
    await expect(page.locator('#features')).toBeInViewport();
  });

  test('"How it Works" nav link scrolls to workflow section', async ({ page }) => {
    await page.getByRole('link', { name: /how it works/i }).first().click();
    await expect(page.locator('#workflow')).toBeInViewport();
  });

  test('"Blog" nav link navigates to /blog/', async ({ page }) => {
    await page.getByRole('link', { name: /^blog$/i }).first().click();
    await expect(page).toHaveURL(/\/blog\/?/);
  });
});

// ─── Modal (header CTA) ───────────────────────────────────────────────────────

test.describe('waitlist modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockTurnstile(page);
    await mockWaitlistApi(page);
    await page.goto('/');
  });

  test('header "Get Early Access" button opens the modal', async ({ page }) => {
    const modal = page.getByTestId('waitlist-modal');
    await expect(modal).toBeHidden();

    await page.getByTestId('modal-trigger').click();
    await expect(modal).toBeVisible();
  });

  test('modal contains email input, submit button, and Turnstile container', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    const modal = page.getByTestId('waitlist-modal');

    await expect(modal.getByRole('textbox')).toBeVisible();
    await expect(modal.getByRole('button', { name: /join waitlist/i })).toBeVisible();
    // Turnstile renders into a hidden div — confirm it exists in the DOM
    await expect(modal.locator('div[style*="display: none"]')).toBeAttached();
  });

  test('submitting a valid email shows success state', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    const modal = page.getByTestId('waitlist-modal');

    await modal.getByRole('textbox').fill('trainer@example.com');
    await modal.getByRole('button', { name: /join waitlist/i }).click();

    await expect(modal.getByTestId('success-state')).toBeVisible({ timeout: 5000 });
  });

  test('submitting empty email shows browser validation (or inline error)', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    const modal = page.getByTestId('waitlist-modal');

    // Click submit with no email — the input is `required` and `type="email"`
    // so either native validation fires or the form blocks submission.
    // We verify the success state is NOT shown (submission was blocked).
    await modal.getByRole('button', { name: /join waitlist/i }).click();
    await expect(modal.getByTestId('success-state')).not.toBeVisible();
  });

  test('submitting triggers error state when API returns failure', async ({ page }) => {
    await page.unroute('**/api/waitlist');
    await mockWaitlistApi(page, { success: false, error: 'Invalid email address' });

    await page.getByTestId('modal-trigger').click();
    const modal = page.getByTestId('waitlist-modal');

    await modal.getByRole('textbox').fill('bad@email.com');
    await modal.getByRole('button', { name: /join waitlist/i }).click();

    await expect(modal.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('modal closes with the X button', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    await expect(page.getByTestId('waitlist-modal')).toBeVisible();

    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByTestId('waitlist-modal')).toBeHidden();
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    await expect(page.getByTestId('waitlist-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('waitlist-modal')).toBeHidden();
  });

  test('modal closes on backdrop click', async ({ page }) => {
    await page.getByTestId('modal-trigger').click();
    await expect(page.getByTestId('waitlist-modal')).toBeVisible();

    // Click the backdrop (the absolute overlay behind the panel)
    await page.locator('.absolute.inset-0.bg-black\\/50').click();
    await expect(page.getByTestId('waitlist-modal')).toBeHidden();
  });

  test('modal can be reopened after closing', async ({ page }) => {
    const trigger = page.getByTestId('modal-trigger');
    const modal = page.getByTestId('waitlist-modal');

    await trigger.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    await trigger.click();
    await expect(modal).toBeVisible();
  });
});

// ─── Inline forms (hero + CTA section) ───────────────────────────────────────

test.describe('hero inline form', () => {
  test.beforeEach(async ({ page }) => {
    await mockTurnstile(page);
    await mockWaitlistApi(page);
    await page.goto('/');
  });

  test('hero form is visible with email input and submit button', async ({ page }) => {
    // The hero form is the first form on the page
    const heroForm = page.locator('form').first();
    await expect(heroForm.getByRole('textbox')).toBeVisible();
    await expect(heroForm.getByRole('button', { name: /join waitlist/i })).toBeVisible();
  });

  test('submitting valid email via hero form shows success state', async ({ page }) => {
    const heroForm = page.locator('form').first();
    await heroForm.getByRole('textbox').fill('trainer@example.com');
    await heroForm.getByRole('button', { name: /join waitlist/i }).click();

    await expect(page.getByTestId('success-state').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('bottom CTA form', () => {
  test.beforeEach(async ({ page }) => {
    await mockTurnstile(page);
    await mockWaitlistApi(page);
    await page.goto('/');
  });

  test('CTA section has email input and "Request Access" submit button', async ({ page }) => {
    const ctaSection = page.locator('#waitlist');
    await expect(ctaSection.getByRole('textbox')).toBeVisible();
    await expect(ctaSection.getByRole('button', { name: /request access/i })).toBeVisible();
  });

  test('submitting valid email via CTA form shows success state', async ({ page }) => {
    const ctaSection = page.locator('#waitlist');
    await ctaSection.getByRole('textbox').fill('trainer@example.com');
    await ctaSection.getByRole('button', { name: /request access/i }).click();

    await expect(ctaSection.getByTestId('success-state')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Regression guards ────────────────────────────────────────────────────────

test.describe('regression guards', () => {
  test('blog index page loads', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
