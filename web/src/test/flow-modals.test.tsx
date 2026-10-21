import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { createFlowMachine } from '@engine/flow.js';
import { GalleryModal } from '@/components/modals/GalleryModal';
import { UploadProgressModal } from '@/components/modals/UploadProgressModal';
import { ClarificationModal } from '@/components/modals/ClarificationModal';
import { OutlineReviewModal } from '@/components/modals/OutlineReviewModal';
import { PedagogyModal } from '@/components/modals/PedagogyModal';
import { ImageModal } from '@/components/modals/ImageModal';
import sampleScene from '@fixtures/scene.sample.json';
import sampleOutline from '@fixtures/outline.sample.json';
import type { LessonSceneJSON, LessonOutline } from '@schemas/types';

describe('Phase F6: Flow Machine & Modals Unit Tests', () => {
  beforeEach(() => {
    useStudioStore.setState({
      scene: JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON,
      currentSlideIndex: 0,
      isGalleryOpen: false,
      galleryIntent: 'upload',
      selectedGalleryPackId: 'basic',
      uploadProgress: {
        isOpen: false,
        step: 'Đang xử lý tài liệu',
        percent: 0,
        desc: 'Vui lòng chờ...',
        icon: '📤',
      },
      isClarificationOpen: false,
      isOutlineReviewOpen: false,
      pendingOutline: null,
      isPedagogyModalOpen: false,
      isImageModalOpen: false,
    });
  });

  describe('Flow Machine (@engine/flow.js)', () => {
    it('executes full state transitions correctly', () => {
      const machine = createFlowMachine({ current: 'gallery' });
      expect(machine.getState().current).toBe('gallery');

      machine.transition({ type: 'SELECT_PACK', packId: 'modern-dark' });
      expect(machine.getState().current).toBe('pack-selected');
      expect(machine.getState().selectedPackId).toBe('modern-dark');

      machine.transition({ type: 'START_UPLOAD' });
      expect(machine.getState().current).toBe('uploading');

      machine.transition({
        type: 'UPLOAD_SUCCESS',
        projectId: 'proj-123',
        needsClarification: true,
      });
      expect(machine.getState().current).toBe('clarifying');
      expect(machine.getState().needsClarification).toBe(true);

      machine.transition({ type: 'CLARIFY_SUBMIT', scene: sampleScene as any });
      expect(machine.getState().current).toBe('studio');
      expect(machine.getState().needsClarification).toBe(false);
    });
  });

  describe('GalleryModal', () => {
    it('renders packs and allows selecting and confirming', () => {
      useStudioStore.setState({ isGalleryOpen: true, galleryIntent: 'upload' });
      render(<GalleryModal />);

      expect(screen.getByText('Kho Bộ Mẫu Giảng Dạy (Template Gallery)')).toBeDefined();

      const modernPack = screen.getByText('Hiện Đại Tối Giản (Modern Minimal)');
      fireEvent.click(modernPack);
      expect(useStudioStore.getState().selectedGalleryPackId).toBe('modern-dark');

      const confirmBtn = document.getElementById('btn-gallery-confirm') as HTMLButtonElement;
      fireEvent.click(confirmBtn);
      expect(useStudioStore.getState().isGalleryOpen).toBe(false);
    });
  });

  describe('UploadProgressModal', () => {
    it('renders progress bar and current step message', () => {
      useStudioStore.setState({
        uploadProgress: {
          isOpen: true,
          step: 'Đang bóc tách nội dung...',
          percent: 45,
          desc: 'Trích xuất văn bản từ tài liệu',
          icon: '📤',
        },
      });

      render(<UploadProgressModal />);
      expect(screen.getByText('Đang bóc tách nội dung...')).toBeDefined();
      expect(screen.getByText('Trích xuất văn bản từ tài liệu')).toBeDefined();

      const progressBar = document.getElementById('upload-progress-bar');
      expect(progressBar?.style.width).toBe('45%');
    });
  });

  describe('ClarificationModal', () => {
    it('renders clarification questions and options', () => {
      useStudioStore.setState({
        isClarificationOpen: true,
        clarificationDocTitle: 'TrietHocDaiCuong.pdf',
      });

      render(<ClarificationModal />);
      expect(screen.getByText('Thiết lập Sư phạm cho Bài giảng')).toBeDefined();
      expect(document.getElementById('clarification-doc-title')?.textContent).toBe(
        'TrietHocDaiCuong.pdf'
      );

      const audienceSelect = document.getElementById('clarify-audience') as HTMLSelectElement;
      expect(audienceSelect.value).toBe('Sinh viên đại học năm thứ nhất');
    });
  });

  describe('OutlineReviewModal', () => {
    it('renders outline slides and mutates titles using outline_editor', () => {
      useStudioStore.setState({
        isOutlineReviewOpen: true,
        pendingOutline: JSON.parse(JSON.stringify(sampleOutline)) as LessonOutline,
      });

      render(<OutlineReviewModal />);
      expect(screen.getByText('Duyệt & Tinh Chỉnh Dàn Bài Sư Phạm (Outline Review)')).toBeDefined();

      const titleInputs = document.querySelectorAll('.outline-slide-title');
      expect(titleInputs.length).toBe(sampleOutline.slides.length);

      // Edit first title
      fireEvent.change(titleInputs[0], { target: { value: 'Tiêu Đề Dàn Bài Mới' } });
      expect((titleInputs[0] as HTMLInputElement).value).toBe('Tiêu Đề Dàn Bài Mới');

      // Add a slide
      const addBtn = document.getElementById('btn-outline-add-slide') as HTMLButtonElement;
      fireEvent.click(addBtn);

      const updatedInputs = document.querySelectorAll('.outline-slide-title');
      expect(updatedInputs.length).toBe(sampleOutline.slides.length + 1);
    });
  });

  describe('PedagogyModal', () => {
    it('audits deck quality and displays scores and issues table', () => {
      useStudioStore.setState({ isPedagogyModalOpen: true });
      render(<PedagogyModal />);

      expect(screen.getByText('Bảng Kiểm Tra Chất Lượng Sư Phạm (P7.4)')).toBeDefined();

      const scoreVal = document.getElementById('pedagogy-score-val');
      expect(scoreVal?.textContent).toBeDefined();
      expect(parseInt(scoreVal?.textContent || '0', 10)).toBeGreaterThan(0);
    });
  });

  describe('ImageModal', () => {
    it('allows choosing an image option and applying to slide', () => {
      useStudioStore.setState({ isImageModalOpen: true });
      render(<ImageModal />);

      expect(screen.getByText('Thay Ảnh Minh Họa Slide')).toBeDefined();

      const sampleImg = document.querySelectorAll('.img-preview-opt')[0];
      fireEvent.click(sampleImg);

      const urlInput = document.getElementById('modal-img-url') as HTMLInputElement;
      expect(urlInput.value).toContain('images.unsplash.com');

      const applyBtn = document.getElementById('btn-apply-img') as HTMLButtonElement;
      act(() => {
        fireEvent.click(applyBtn);
      });

      expect(useStudioStore.getState().isImageModalOpen).toBe(false);
    });
  });
});
