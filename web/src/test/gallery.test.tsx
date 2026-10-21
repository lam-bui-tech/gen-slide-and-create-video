import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryPage } from '@/components/gallery/GalleryPage';
import {
  GALLERY_PACKS,
  filterGalleryPacks,
} from '@/lib/galleryPacks';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Gallery Component & Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('filterGalleryPacks pure function', () => {
    it('returns all packs when filters and search query are empty', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, '', [], [], []);
      expect(result.length).toBe(GALLERY_PACKS.length);
    });

    it('filters packs by search term in title or description', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, 'cyber', [], [], []);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('cyber-tech');
    });

    it('filters packs by subject tag', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, '', ['khoa-hoc-tu-nhien'], [], []);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((p) => {
        expect(p.tags.subject).toContain('khoa-hoc-tu-nhien');
      });
    });

    it('filters packs by style tag', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, '', [], ['hoc-thuat-nghiem-tuc'], []);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('basic');
    });

    it('filters packs by effect tag', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, '', [], [], ['chu-danh-may-typewriter']);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('cyber-tech');
    });

    it('returns empty array when search query matches nothing', () => {
      const result = filterGalleryPacks(GALLERY_PACKS, 'nonexistent-query-xyz', [], [], []);
      expect(result.length).toBe(0);
    });
  });

  describe('GalleryPage rendering and user interactions', () => {
    it('renders header, brand title, and filter sidebar', () => {
      render(<GalleryPage />);

      expect(screen.getByRole('heading', { level: 1, name: 'AI Lecture Studio' })).toBeInTheDocument();
      expect(screen.getByText('Bộ Lọc Bố Cục')).toBeInTheDocument();
      expect(screen.getByText('Môn Học (Subject)')).toBeInTheDocument();
      expect(screen.getByText('Phong Cách (Style)')).toBeInTheDocument();
      expect(screen.getByText('Hiệu Ứng (Effect)')).toBeInTheDocument();
    });

    it('filters cards dynamically when typing in search input', () => {
      render(<GalleryPage />);

      const searchInput = screen.getByPlaceholderText('Tìm theo tên pack, môn học, từ khóa...');
      fireEvent.change(searchInput, { target: { value: 'Cyber' } });

      expect(screen.getByText(/Đang hiển thị 1 template pack/i)).toBeInTheDocument();
      expect(screen.getAllByText('Công Nghệ & Lập Trình (Cyber Tech)')[0]).toBeInTheDocument();
      expect(screen.queryByText('Học Thuật Cơ Bản (Academic Basic)')).not.toBeInTheDocument();
    });

    it('opens detail drawer when clicking a card and closes it with close button', () => {
      render(<GalleryPage />);

      // Click on the first pack card
      const basicCard = screen.getAllByText('Học Thuật Cơ Bản (Academic Basic)')[0];
      fireEvent.click(basicCard);

      // Drawer should show details
      expect(screen.getByText('Bảng Màu & Tokens')).toBeInTheDocument();
      expect(screen.getByText(/Danh Sách Bố Cục Sư Phạm/i)).toBeInTheDocument();

      // Close drawer
      const closeBtn = screen.getByLabelText('Đóng chi tiết');
      fireEvent.click(closeBtn);

      expect(screen.queryByText('Bảng Màu & Tokens')).not.toBeInTheDocument();
    });

    it('navigates to Studio with packId when clicking "Dùng template"', () => {
      render(<GalleryPage />);

      const useButtons = screen.getAllByText('Dùng template');
      fireEvent.click(useButtons[0]);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/studio?packId='));
    });

    it('shows empty state when no pack matches and resets on button click', () => {
      render(<GalleryPage />);

      const searchInput = screen.getByPlaceholderText('Tìm theo tên pack, môn học, từ khóa...');
      fireEvent.change(searchInput, { target: { value: 'xyz_no_match' } });

      expect(screen.getByText('Không tìm thấy Template Pack phù hợp')).toBeInTheDocument();

      const resetBtn = screen.getByText('Xóa bộ lọc & Tải lại');
      fireEvent.click(resetBtn);

      expect(screen.queryByText('Không tìm thấy Template Pack phù hợp')).not.toBeInTheDocument();
    });
  });
});
