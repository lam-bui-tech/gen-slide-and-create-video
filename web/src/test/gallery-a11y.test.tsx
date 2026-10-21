import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryPage } from '@/components/gallery/GalleryPage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('GalleryPage Accessibility (a11y) Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ensures pack-card does not have role="button" or tabIndex="0" to prevent nested-interactive violations', () => {
    const { container } = render(<GalleryPage />);
    const cards = container.querySelectorAll('.pack-card');
    expect(cards.length).toBeGreaterThan(0);

    cards.forEach((card) => {
      // Must not be role="button" or focusable container around nested buttons
      expect(card.getAttribute('role')).not.toBe('button');
      expect(card.getAttribute('tabindex')).toBeNull();

      // Child buttons must have accessible labels
      const buttons = card.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      buttons.forEach((btn) => {
        expect(btn.getAttribute('aria-label') || btn.textContent).toBeTruthy();
      });
    });
  });

  it('ensures filter group titles are semantic headings (h3) for screen reader landmark navigation', () => {
    const { container } = render(<GalleryPage />);
    const headings = container.querySelectorAll('h3.filter-group-title');
    expect(headings.length).toBe(3);
    const titles = Array.from(headings).map((h) => h.textContent?.trim());
    expect(titles).toContain('Môn Học (Subject)');
    expect(titles).toContain('Phong Cách (Style)');
    expect(titles).toContain('Hiệu Ứng (Effect)');
  });

  it('ensures drawer overlay has no dangling aria-labelledby when closed, and valid dialog attributes when open', () => {
    const { container } = render(<GalleryPage />);
    const overlay = container.querySelector('#gallery-drawer-overlay');
    expect(overlay).not.toBeNull();

    // When closed: must not claim to be a dialog with non-existent drawer-title
    expect(overlay?.getAttribute('role')).toBeNull();
    expect(overlay?.getAttribute('aria-labelledby')).toBeNull();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');

    // Open drawer by clicking first card
    const firstCard = container.querySelector('.pack-card');
    fireEvent.click(firstCard!);

    // When open: must be role="dialog", aria-modal="true", and drawer-title must exist
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(overlay?.getAttribute('aria-labelledby')).toBe('drawer-title');
    expect(overlay?.getAttribute('aria-hidden')).toBe('false');

    const drawerTitle = container.querySelector('#drawer-title');
    expect(drawerTitle).not.toBeNull();
    expect(drawerTitle?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('ensures results-count has role="status" and aria-live="polite" for system status visibility (Heuristic 1)', () => {
    const { container } = render(<GalleryPage />);
    const resultsCount = container.querySelector('#results-count');
    expect(resultsCount).not.toBeNull();
    expect(resultsCount?.getAttribute('role')).toBe('status');
    expect(resultsCount?.getAttribute('aria-live')).toBe('polite');
  });

  it('ensures brand logo header links to root home page "/" (Heuristic 3: User Control & Freedom)', () => {
    const { container } = render(<GalleryPage />);
    const brandLink = container.querySelector('header a.gallery-brand-group');
    expect(brandLink).not.toBeNull();
    expect(brandLink?.getAttribute('href')).toBe('/');
    expect(brandLink?.getAttribute('aria-label')).toBeTruthy();
  });

  it('ensures help and documentation navigation links exist in header and footer (Heuristic 10)', () => {
    const { container } = render(<GalleryPage />);
    const headerHelp = container.querySelector('#btn-header-help');
    expect(headerHelp).not.toBeNull();
    expect(headerHelp?.getAttribute('href')).toBe('#help-section');

    const footer = container.querySelector('footer#help-section');
    expect(footer).not.toBeNull();
    const footerLinks = footer?.querySelectorAll('a');
    expect(footerLinks && footerLinks.length).toBeGreaterThan(3);
  });
});
