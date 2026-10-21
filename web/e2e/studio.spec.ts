import { test, expect } from '@playwright/test';

test.describe('AI Lecture Studio Next.js E2E Parity Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    // Wait for the workspace and initial sample slides to load
    await expect(page.locator('.studio-navbar')).toBeVisible();
    await expect(page.locator('.slide-card-item').first()).toBeVisible({ timeout: 10000 });
  });

  test('Navbar renders brand, editable title, and action controls', async ({ page }) => {
    await expect(page.locator('.nav-brand')).toContainText('AI Lecture Studio');
    await expect(page.locator('#project-title-input')).toBeVisible();
    await expect(page.locator('#save-status')).toBeVisible();

    await expect(page.locator('#btn-new-project')).toBeVisible();
    await expect(page.locator('#btn-upload-doc')).toBeVisible();
    await expect(page.locator('#btn-pedagogy-review')).toBeVisible();
    await expect(page.locator('#btn-undo')).toBeVisible();
    await expect(page.locator('#btn-redo')).toBeVisible();
    await expect(page.locator('#btn-presentation-mode')).toBeVisible();
    await expect(page.locator('#btn-export-pdf')).toBeVisible();
    await expect(page.locator('#btn-export-pptx')).toBeVisible();
    await expect(page.locator('#btn-export-mp4')).toBeVisible();
  });

  test('Slide Navigator lists slides and allows slide switching', async ({ page }) => {
    const navPanel = page.locator('.slide-navigator');
    await expect(navPanel).toBeVisible();

    const slideCards = page.locator('.slide-card-item');
    const count = await slideCards.count();
    expect(count).toBeGreaterThan(0);

    // Switch to slide 2 if more than 1 slide
    if (count > 1) {
      await slideCards.nth(1).click();
      await expect(page.locator('#canvas-slide-indicator')).toContainText('Slide 2');
    }
  });

  test('Canvas area renders live slide, resolution indicator, and timeline bar', async ({ page }) => {
    await expect(page.locator('#live-canvas')).toBeVisible();
    await expect(page.locator('text=1920 × 1080 (16:9)')).toBeVisible();
    await expect(page.locator('#canvas-slide-indicator')).toBeVisible();

    // Timeline bar
    await expect(page.locator('#timeline-slider')).toBeVisible();
    await expect(page.locator('#btn-timeline-play')).toBeVisible();
    await expect(page.locator('#btn-timeline-stop')).toBeVisible();
  });

  test('Properties panel displays template and variant options', async ({ page }) => {
    await expect(page.locator('#prop-template-select')).toBeVisible();
    await expect(page.locator('#prop-narration-input')).toBeVisible();
    await expect(page.locator('#prop-voice-select')).toBeVisible();
  });

  test('Builder mode can be toggled on and off', async ({ page }) => {
    const toggleBtn = page.locator('#btn-toggle-builder-mode');
    await expect(toggleBtn).toBeVisible();

    // Toggle on
    await toggleBtn.click();
    await expect(page.locator('#builder-toolbar')).toBeVisible();
    await expect(page.locator('#builder-live-canvas')).toBeVisible();
    await expect(page.locator('#builder-inspector-panel')).toBeVisible();

    // Toggle off
    await page.locator('#builder-exit-btn').click();
    await expect(page.locator('#builder-toolbar')).not.toBeVisible();
    await expect(page.locator('#live-canvas')).toBeVisible();
  });

  test('Pedagogy review modal opens and displays score', async ({ page }) => {
    const pedagogyBtn = page.locator('#btn-pedagogy-review');
    await pedagogyBtn.click();

    await expect(page.locator('#pedagogy-modal')).toBeVisible();
    await expect(page.locator('#pedagogy-score-val')).toBeVisible();

    // Close modal
    await page.locator('#btn-close-pedagogy-modal').click();
    await expect(page.locator('#pedagogy-modal')).not.toBeVisible();
  });

  test('Debug drawer toggles with D key and shows active tabs', async ({ page }) => {
    // Press D to open
    await page.keyboard.press('d');
    await expect(page.locator('#debug-drawer')).toBeVisible();
    await expect(page.locator('text=Studio Debugger')).toBeVisible();

    // Switch to Actions tab
    await page.locator('button:has-text("Action Log")').click();
    await expect(page.locator('#debug-drawer')).toContainText('Action Log');

    // Switch to API Logs tab
    await page.locator('button:has-text("API Logs")').click();
    await expect(page.locator('#debug-drawer')).toContainText('API Logs');

    // Close debug drawer
    await page.locator('#btn-close-debug-drawer').click();
    await expect(page.locator('#debug-drawer')).not.toBeVisible();
  });

  test('Presentation mode opens fullscreen and can be closed with Escape', async ({ page }) => {
    const presBtn = page.locator('#btn-presentation-mode');
    await presBtn.click();

    await expect(page.locator('#presentation-modal')).toBeVisible();
    await expect(page.locator('#presentation-hud')).toBeVisible();
    await expect(page.locator('#pres-slide-indicator')).toBeVisible();

    // Press Escape to exit
    await page.keyboard.press('Escape');
    await expect(page.locator('#presentation-modal')).not.toBeVisible();
  });
});
