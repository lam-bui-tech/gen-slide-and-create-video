import { test, expect } from '@playwright/test';

test.describe('Template Gallery E2E Suite (Landing Page /)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.gallery-header')).toBeVisible();
    await expect(page.locator('.pack-card').first()).toBeVisible();
  });

  test('Header renders brand, quick start, and studio navigation', async ({ page }) => {
    await expect(page.locator('.nav-brand')).toContainText('AI Lecture Studio');
    await expect(page.locator('#btn-quick-start')).toBeVisible();
    await expect(page.locator('#btn-goto-studio')).toBeVisible();

    // Verify link to studio
    await expect(page.locator('#btn-goto-studio')).toHaveAttribute('href', '/studio');
  });

  test('Filter sidebar and search toolbar filter cards dynamically', async ({ page }) => {
    const cards = page.locator('.pack-card');
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThanOrEqual(4);

    // Search for "cyber"
    const searchInput = page.locator('#gallery-search-input');
    await searchInput.fill('cyber');
    await expect(page.locator('.pack-card')).toHaveCount(1);
    await expect(page.locator('.pack-card').first()).toContainText('Cyber Tech');

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('.pack-card')).toHaveCount(initialCount);

    // Filter by subject checkbox "toan-tin"
    const toanTinCheckbox = page.locator('#filter-subject input[value="toan-tin"]');
    await toanTinCheckbox.check();
    const filteredCount = await page.locator('.pack-card').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Reset filters
    await page.locator('#btn-reset-filters').click();
    await expect(page.locator('.pack-card')).toHaveCount(initialCount);
  });

  test('Pack detail drawer opens on click, shows tokens and layouts, and closes with Escape', async ({ page }) => {
    // Click on the first pack card
    const firstCard = page.locator('.pack-card').first();
    await firstCard.click();

    // Drawer should open
    const drawer = page.locator('#gallery-drawer-overlay');
    await expect(drawer).toHaveClass(/open/);
    await expect(page.locator('#drawer-title')).toBeVisible();
    await expect(page.locator('#drawer-swatches')).toBeVisible();
    await expect(page.locator('#drawer-layouts-list')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/open/);
  });

  test('Clicking "Dùng template" navigates to Studio with packId', async ({ page }) => {
    const useBtn = page.locator('.btn-use-card[data-use-id="basic"]').first();
    await useBtn.click();

    // URL should transition to /studio?packId=basic
    await page.waitForURL(/\/studio\?packId=basic/);
    await expect(page.locator('.studio-navbar')).toBeVisible();
  });
});
