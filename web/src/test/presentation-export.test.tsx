import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStudioStore } from '@/store/useStudioStore';
import { PresentationMode } from '@/components/presentation/PresentationMode';
import { useExportPolling } from '@/hooks/useExportPolling';
import { renderHook } from '@testing-library/react';
import { api } from '@/lib/api';

describe('Phase F8: Presentation Mode & Export Polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    useStudioStore.setState({
      isPresentationActive: false,
      presentationIndex: 0,
      presentationIsPlaying: false,
      activeExport: null,
      uploadProgress: {
        isOpen: false,
        step: '',
        percent: 0,
        desc: '',
        icon: '',
      },
      scene: {
        schemaVersion: 2,
        projectId: 'test-pres-proj',
        title: 'Bài Giảng Kiểm Thử Trình Chiếu',
        packId: 'basic',
        slides: [
          {
            slideId: 's-1',
            templateId: 'title-slide',
            variantId: 'default',
            layoutVariant: 'default',
            title: 'Slide Số Một',
            subtitle: 'Phụ đề 1',
            durationSeconds: 10,
            slotValues: {},
            media: [],
            elements: [],
            animations: [],
            voice: { narration: 'Slide 1', provider: 'vieneu', voiceId: 'BanMai', durationSeconds: 10 },
          },
          {
            slideId: 's-2',
            templateId: 'concept-explain',
            variantId: 'default',
            layoutVariant: 'default',
            title: 'Slide Số Hai',
            durationSeconds: 15,
            slotValues: {},
            media: [],
            elements: [],
            animations: [],
            voice: { narration: 'Slide 2', provider: 'vieneu', voiceId: 'BanMai', durationSeconds: 15 },
          },
        ],
        totalDurationSeconds: 25,
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('PresentationMode', () => {
    it('does not render when isPresentationActive is false', () => {
      const { container } = render(<PresentationMode />);
      expect(container.firstChild).toBeNull();
    });

    it('renders stage, slide indicator, and HUD when active', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 0 });
      render(<PresentationMode />);

      expect(screen.getByText('Slide 1 / 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /✕ Thoát/i })).toBeInTheDocument();
      expect(screen.getByTitle(/Thoát trình chiếu/i)).toBeInTheDocument();
    });

    it('navigates to next slide on next button click', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 0 });
      render(<PresentationMode />);

      const nextBtn = screen.getByTitle(/Slide tiếp theo/i);
      fireEvent.click(nextBtn);

      expect(useStudioStore.getState().presentationIndex).toBe(1);
    });

    it('prev button is disabled on first slide', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 0 });
      render(<PresentationMode />);

      const prevBtn = screen.getByTitle(/Slide trước/i) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
    });

    it('next button is disabled on last slide', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 1 });
      render(<PresentationMode />);

      const nextBtn = screen.getByTitle(/Slide tiếp theo/i) as HTMLButtonElement;
      expect(nextBtn.disabled).toBe(true);
    });

    it('toggles play/pause when play button is clicked', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 0 });
      render(<PresentationMode />);

      const playBtn = screen.getByTitle(/Phát \/ Tạm dừng/i);
      expect(playBtn).toBeInTheDocument();

      fireEvent.click(playBtn);
      // Since it was playing on start, clicking pauses it
      expect(useStudioStore.getState().presentationIsPlaying).toBe(false);

      fireEvent.click(playBtn);
      expect(useStudioStore.getState().presentationIsPlaying).toBe(true);
    });

    it('responds to keyboard navigation: Escape exits presentation', () => {
      useStudioStore.setState({ isPresentationActive: true });
      render(<PresentationMode />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useStudioStore.getState().isPresentationActive).toBe(false);
    });

    it('responds to keyboard navigation: ArrowRight advances slide', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIndex: 0 });
      render(<PresentationMode />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(useStudioStore.getState().presentationIndex).toBe(1);
    });

    it('HUD auto-hides after 2.5s of inactivity when playing', () => {
      useStudioStore.setState({ isPresentationActive: true, presentationIsPlaying: true });
      render(<PresentationMode />);

      const hud = document.getElementById('presentation-hud');
      expect(hud).not.toHaveClass('hidden');

      act(() => {
        vi.advanceTimersByTime(2600);
      });

      expect(hud).toHaveClass('hidden');

      // Mousemove restores HUD
      const modal = document.getElementById('presentation-modal');
      if (modal) {
        fireEvent.mouseMove(modal);
        expect(hud).not.toHaveClass('hidden');
      }
    });
  });

  describe('useExportPolling', () => {
    it('polls GET /exports/{exportId} until completed and opens download', async () => {
      let callCount = 0;
      vi.spyOn(api, 'getExportStatus').mockImplementation(async () => {
        callCount += 1;
        if (callCount >= 2) {
          return {
            exportId: 'exp-123',
            type: 'PDF',
            status: 'completed',
            progress: 100,
            downloadUrl: '/storage/exports/deck.pdf',
          };
        }
        return {
          exportId: 'exp-123',
          type: 'PDF',
          status: 'rendering',
          progress: 50,
          downloadUrl: null,
        };
      });

      useStudioStore.setState({
        activeExport: {
          exportId: 'exp-123',
          type: 'PDF',
          status: 'rendering',
          progress: 20,
        },
      });

      renderHook(() => useExportPolling(1000, 10));

      expect(useStudioStore.getState().uploadProgress.isOpen).toBe(true);
      expect(useStudioStore.getState().uploadProgress.step).toContain('PDF');

      // First tick
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(callCount).toBe(1);
      expect(useStudioStore.getState().activeExport?.status).toBe('rendering');

      // Second tick: completed
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(callCount).toBe(2);
      expect(useStudioStore.getState().activeExport?.status).toBe('completed');
      expect(useStudioStore.getState().activeExport?.downloadUrl).toBe('/storage/exports/deck.pdf');
      expect(useStudioStore.getState().uploadProgress.percent).toBe(100);
      expect(useStudioStore.getState().uploadProgress.step).toContain('Hoàn tất');
    });

    it('stops polling and sets error when job fails', async () => {
      vi.spyOn(api, 'getExportStatus').mockResolvedValue({
        exportId: 'exp-fail',
        type: 'PPTX',
        status: 'failed',
        progress: 40,
        error: 'Out of memory rendering slides',
        downloadUrl: null,
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      useStudioStore.setState({
        activeExport: {
          exportId: 'exp-fail',
          type: 'PPTX',
          status: 'rendering',
          progress: 10,
        },
      });

      renderHook(() => useExportPolling(1000, 10));

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(useStudioStore.getState().activeExport?.status).toBe('failed');
      expect(useStudioStore.getState().activeExport?.error).toContain('Out of memory');
      expect(useStudioStore.getState().uploadProgress.isOpen).toBe(false);
      expect(alertSpy).toHaveBeenCalled();
    });

    it('times out after maxAttempts if export stays rendering', async () => {
      vi.spyOn(api, 'getExportStatus').mockResolvedValue({
        exportId: 'exp-timeout',
        type: 'MP4',
        status: 'rendering',
        progress: 30,
        downloadUrl: null,
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      useStudioStore.setState({
        activeExport: {
          exportId: 'exp-timeout',
          type: 'MP4',
          status: 'rendering',
          progress: 30,
        },
      });

      renderHook(() => useExportPolling(100, 3)); // 3 attempts @ 100ms

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(useStudioStore.getState().activeExport?.status).toBe('failed');
      expect(useStudioStore.getState().activeExport?.error).toContain('timeout');
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
