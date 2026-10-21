import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { TemplateSelect } from '@/components/props/TemplateSelect';
import { VariantGrid } from '@/components/props/VariantGrid';
import { NarrationBox } from '@/components/props/NarrationBox';
import { VoicePanel } from '@/components/props/VoicePanel';
import { AnimationList } from '@/components/props/AnimationList';
import { MediaStrip } from '@/components/props/MediaStrip';
import { VideoInspector } from '@/components/props/VideoInspector';
import { SlideChat } from '@/components/props/SlideChat';
import { PropsPanel } from '@/components/props/PropsPanel';
import { api } from '@/lib/api';
import sampleScene from '@fixtures/scene.sample.json';
import type { LessonSceneJSON } from '@schemas/types';

describe('Phase F5: Properties Panel Unit Tests', () => {
  beforeEach(() => {
    useStudioStore.setState({
      scene: JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON,
      currentSlideIndex: 0,
      history: [JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON],
      historyIndex: 0,
      saveStatus: 'saved',
      pendingChatPatch: null,
      isAudioJobRunning: false,
    });
  });

  describe('TemplateSelect', () => {
    it('renders current template and dispatches change on select', () => {
      render(<TemplateSelect />);
      const select = document.getElementById('prop-template-select') as HTMLSelectElement;
      expect(select.value).toBe(sampleScene.slides[0].templateId);

      fireEvent.change(select, { target: { value: 'concept-explain' } });

      const updated = useStudioStore.getState().scene?.slides[0];
      expect(updated?.templateId).toBe('concept-explain');
      expect(updated?.layoutVariant).toBe('default');
    });
  });

  describe('VariantGrid', () => {
    it('displays active variant pill and dispatches change on pill click', () => {
      render(<VariantGrid />);
      const pills = document.querySelectorAll('.variant-pill');
      expect(pills.length).toBeGreaterThan(0);

      const stackedPill = Array.from(pills).find(
        (p) => (p as HTMLElement).dataset.variant === 'stacked-top'
      );
      expect(stackedPill).toBeDefined();

      fireEvent.click(stackedPill!);
      const updated = useStudioStore.getState().scene?.slides[0];
      expect(updated?.layoutVariant).toBe('stacked-top');
    });
  });

  describe('NarrationBox', () => {
    it('updates character and word count statistics accurately', () => {
      render(<NarrationBox />);
      const textarea = document.getElementById('prop-narration-input') as HTMLTextAreaElement;
      expect(textarea.value).toBe(sampleScene.slides[0].voice.narration);

      fireEvent.change(textarea, { target: { value: 'Hôm nay chúng ta học triết học' } });

      const charCountEl = document.getElementById('narration-char-count');
      expect(charCountEl?.textContent).toContain('7 từ');

      act(() => {
        fireEvent.blur(textarea);
      });

      const updated = useStudioStore.getState().scene?.slides[0];
      expect(updated?.voice.narration).toBe('Hôm nay chúng ta học triết học');
    });
  });

  describe('VoicePanel', () => {
    it('displays voice duration and calls synthesizeAudio on regenerate click', async () => {
      const synthSpy = vi.spyOn(api, 'synthesizeAudio').mockResolvedValue({
        slideId: 'slide-01',
        audioUrl: 'storage/projects/sample/audio/new.wav',
        durationSeconds: 12.5,
      });

      render(<VoicePanel />);
      const durLabel = document.getElementById('voice-duration-label');
      expect(durLabel?.textContent).toContain('15.2s');

      const regenBtn = document.getElementById('btn-regen-voice') as HTMLButtonElement;
      await act(async () => {
        fireEvent.click(regenBtn);
      });

      expect(synthSpy).toHaveBeenCalled();
      const updatedVoice = useStudioStore.getState().scene?.slides[0].voice;
      expect(updatedVoice?.audioUrl).toBe('storage/projects/sample/audio/new.wav');
      expect(updatedVoice?.durationSeconds).toBe(12.5);

      synthSpy.mockRestore();
    });
  });

  describe('AnimationList', () => {
    it('applies quick animation presets via SET_ANIMATION', () => {
      render(<AnimationList />);
      const quickBtns = document.querySelectorAll('.btn-quick-anim');
      expect(quickBtns.length).toBe(4);

      fireEvent.click(quickBtns[1]); // slide-in
      const slide = useStudioStore.getState().scene?.slides[0];
      expect(slide?.animations[0].preset).toBe('slide-in');
    });
  });

  describe('MediaStrip', () => {
    it('loads candidates and applies candidate on click', async () => {
      const getMediaSpy = vi.spyOn(api, 'getMediaRecommendations').mockResolvedValue([
        { url: 'storage/custom_img.jpg', type: 'diagram', source: 'diagram', label: 'Custom Diagram' } as any,
      ]);

      render(<MediaStrip />);

      await waitFor(() => {
        expect(screen.getByText('Custom Diagram')).toBeDefined();
      });

      const card = screen.getByText('Custom Diagram');
      fireEvent.click(card);

      const slide = useStudioStore.getState().scene?.slides[0];
      expect(slide?.layoutVariant).not.toBe('no-image');

      getMediaSpy.mockRestore();
    });
  });

  describe('VideoInspector', () => {
    it('updates video element parameters and removes video when requested', () => {
      // Add video element to slide 0
      useStudioStore.setState((s) => ({
        scene: s.scene
          ? {
              ...s.scene,
              slides: [
                {
                  ...s.scene.slides[0],
                  elements: [
                    ...s.scene.slides[0].elements,
                    {
                      id: 'vid-test',
                      type: 'video',
                      content: 'storage/clip.mp4',
                      trimStart: 1.0,
                      trimEnd: 8.0,
                      volume: 0.8,
                      ducking: true,
                    },
                  ],
                },
                ...s.scene.slides.slice(1),
              ],
            }
          : null,
      }));

      render(<VideoInspector />);
      const srcInput = document.getElementById('video-src-input') as HTMLInputElement;
      expect(srcInput.value).toBe('storage/clip.mp4');

      const trimStartInput = document.getElementById('video-trim-start') as HTMLInputElement;
      fireEvent.change(trimStartInput, { target: { value: '2.5' } });

      const slide = useStudioStore.getState().scene?.slides[0];
      const vid = slide?.elements.find((e: any) => e.type === 'video') as any;
      expect(vid?.trimStart).toBe(2.5);

      const removeBtn = document.getElementById('btn-video-remove') as HTMLButtonElement;
      fireEvent.click(removeBtn);

      const updatedSlide = useStudioStore.getState().scene?.slides[0];
      expect(updatedSlide?.elements.some((e: any) => e.type === 'video')).toBe(false);
    });
  });

  describe('SlideChat', () => {
    it('sends prompt, displays diff, and applies patch', async () => {
      const chatSpy = vi.spyOn(api, 'slideChat').mockResolvedValue({
        slideId: 'slide-01',
        patch: { slotValues: { title: 'Tiêu Đề AI Cải Tiến' } },
        diff: {
          title: { from: 'Cũ', to: 'Tiêu Đề AI Cải Tiến' },
        },
        explanation: 'Đã rút gọn tiêu đề',
      });

      render(<SlideChat />);
      const input = document.getElementById('slide-chat-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Rút gọn tiêu đề' } });

      const sendBtn = document.getElementById('btn-slide-chat-send') as HTMLButtonElement;
      await act(async () => {
        fireEvent.click(sendBtn);
      });

      expect(chatSpy).toHaveBeenCalled();
      expect(screen.getByText('Đã rút gọn tiêu đề')).toBeDefined();

      const applyBtn = document.getElementById('btn-slide-chat-apply') as HTMLButtonElement;
      act(() => {
        fireEvent.click(applyBtn);
      });

      const updatedSlide = useStudioStore.getState().scene?.slides[0];
      expect(updatedSlide?.title).toBe('Tiêu Đề AI Cải Tiến');
      expect(useStudioStore.getState().pendingChatPatch).toBeNull();

      chatSpy.mockRestore();
    });
  });

  describe('PropsPanel Assembly', () => {
    it('renders all sections without throwing', () => {
      const { container } = render(<PropsPanel />);
      expect(container.querySelector('.props-header')).toBeDefined();
      expect(document.getElementById('prop-template-select')).toBeDefined();
      expect(document.getElementById('prop-narration-input')).toBeDefined();
    });
  });
});
