import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { SlideCanvas } from '@/components/canvas/SlideCanvas';
import { TimelineBar } from '@/components/canvas/TimelineBar';
import {
  EDITABLE_SELECTORS,
  isEditableElement,
  getEditableDefinition,
  computeSlideHash,
  formatSeconds,
} from '@/lib/editableSelectors';
import { renderSlide } from '@templates/index.js';
import sampleScene from '@fixtures/scene.sample.json';
import type { LessonSceneJSON } from '@schemas/types';

describe('Phase F4: Canvas & Timeline Unit Tests', () => {
  describe('Pure Helpers (lib/editableSelectors.ts)', () => {
    it('formats seconds to MM:SS.S format correctly', () => {
      expect(formatSeconds(0)).toBe('00:00.0');
      expect(formatSeconds(5.2)).toBe('00:05.2');
      expect(formatSeconds(16.0)).toBe('00:16.0');
      expect(formatSeconds(65.7)).toBe('01:05.7');
      expect(formatSeconds(125.4)).toBe('02:05.4');
      expect(formatSeconds(-1)).toBe('00:00.0');
    });

    it('computes deterministic slide hashes', () => {
      const slideA = sampleScene.slides[0];
      const slideB = JSON.parse(JSON.stringify(slideA));
      expect(computeSlideHash(slideA)).toBe(computeSlideHash(slideB));

      slideB.title = 'Different Title';
      expect(computeSlideHash(slideA)).not.toBe(computeSlideHash(slideB));
    });

    it('identifies all 12 editable selectors correctly', () => {
      expect(EDITABLE_SELECTORS.length).toBe(13);

      const div = document.createElement('div');
      div.className = 'slide-title';
      expect(isEditableElement(div)).toBe(true);
      expect(getEditableDefinition(div)?.selector).toBe('.slide-title');

      const nonEditable = document.createElement('div');
      nonEditable.className = 'random-container';
      expect(isEditableElement(nonEditable)).toBe(false);
      expect(getEditableDefinition(nonEditable)).toBeNull();
    });
  });

  describe('XSS Escaping & Script Injection Audit', () => {
    it('escapes script tags and attributes in slide title and content', () => {
      const maliciousSlide = {
        slideId: 'slide-xss',
        templateId: 'title-slide',
        layoutVariant: 'default',
        title: '<script>alert("xss")</script>',
        subtitle: '<img src=x onerror=alert(1)>',
        elements: [
          { id: 'bad-elem', type: 'text', content: '<svg onload=alert(2)>' },
        ],
        voice: {
          narration: 'Thử nghiệm bảo mật XSS',
          provider: 'vieneu',
          durationSeconds: 3.0,
        },
        durationSeconds: 4.0,
      };

      const html = renderSlide(maliciousSlide as any, 0, 4.0);
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
  });

  describe('SlideCanvas Component', () => {
    beforeEach(() => {
      useStudioStore.setState({
        scene: JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON,
        currentSlideIndex: 0,
        history: [JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON],
        historyIndex: 0,
        saveStatus: 'saved',
      });
    });

    it('renders the 1920x1080 canvas container and marks editable selectors', () => {
      render(<SlideCanvas />);
      const canvasEl = document.getElementById('live-canvas');
      expect(canvasEl).toBeDefined();

      const titleEl = canvasEl?.querySelector('.slide-title');
      expect(titleEl).toBeDefined();
      expect(titleEl?.getAttribute('contenteditable')).toBe('true');
      expect(titleEl?.getAttribute('spellcheck')).toBe('false');
    });

    it('commits title changes on blur via UPDATE_SLIDE', () => {
      render(<SlideCanvas />);
      const canvasEl = document.getElementById('live-canvas');
      const titleEl = canvasEl?.querySelector('.slide-title') as HTMLElement;
      expect(titleEl).toBeDefined();

      // Change text and blur
      titleEl.innerText = 'Tiêu Đề Mới Đã Sửa';
      act(() => {
        fireEvent.blur(titleEl);
      });

      const updatedSlide = useStudioStore.getState().scene?.slides[0];
      expect(updatedSlide?.title).toBe('Tiêu Đề Mới Đã Sửa');
      expect(useStudioStore.getState().actionLog[0].name).toBe('Sửa tiêu đề slide');
    });

    it('commits subtitle changes on blur via UPDATE_SLIDE', () => {
      render(<SlideCanvas />);
      const canvasEl = document.getElementById('live-canvas');
      const subEl = canvasEl?.querySelector('.title-hero-sub') as HTMLElement;
      expect(subEl).toBeDefined();

      subEl.innerText = 'Phụ Đề Đã Biên Tập';
      act(() => {
        fireEvent.blur(subEl);
      });

      const updatedSlide = useStudioStore.getState().scene?.slides[0];
      expect(updatedSlide?.subtitle).toBe('Phụ Đề Đã Biên Tập');
      expect(useStudioStore.getState().actionLog[0].name).toBe('Sửa phụ đề slide');
    });

    it('triggers openImageModal when an image inside canvas is clicked', () => {
      render(<SlideCanvas />);
      const canvasEl = document.getElementById('live-canvas');
      const img = canvasEl?.querySelector('img') as HTMLImageElement;
      expect(img).toBeDefined();

      fireEvent.click(img);
      expect(useStudioStore.getState().isImageModalOpen).toBe(true);
    });
  });

  describe('TimelineBar Component', () => {
    it('renders current time, total duration, and controls', () => {
      const onPlay = vi.fn();
      const onPause = vi.fn();
      const onStop = vi.fn();
      const onSeek = vi.fn();

      const { rerender } = render(
        <TimelineBar
          isPlaying={false}
          currentTime={4.5}
          totalDuration={16.0}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onSeek={onSeek}
        />
      );

      expect(document.getElementById('time-current')?.textContent).toBe('00:04.5');
      expect(document.getElementById('time-total')?.textContent).toBe('00:16.0');

      const playBtn = document.getElementById('btn-timeline-play') as HTMLButtonElement;
      expect(playBtn.textContent).toBe('▶');
      fireEvent.click(playBtn);
      expect(onPlay).toHaveBeenCalled();

      // Rerender as playing
      rerender(
        <TimelineBar
          isPlaying={true}
          currentTime={4.5}
          totalDuration={16.0}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onSeek={onSeek}
        />
      );
      expect(playBtn.textContent).toBe('⏸');
      fireEvent.click(playBtn);
      expect(onPause).toHaveBeenCalled();

      // Test stop
      const stopBtn = document.getElementById('btn-timeline-stop') as HTMLButtonElement;
      fireEvent.click(stopBtn);
      expect(onStop).toHaveBeenCalled();

      // Test scrubber
      const slider = document.getElementById('timeline-slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '8.2' } });
      expect(onSeek).toHaveBeenCalledWith(8.2);
    });
  });
});
