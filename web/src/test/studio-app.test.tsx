import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { StudioApp } from '@/components/studio/StudioApp';
import { useStudioStore } from '@/store/useStudioStore';
import sampleScene from '@fixtures/scene.sample.json';
import type { LessonSceneJSON } from '@schemas/types';

describe('Phase F10: StudioApp & Timeline Scrubber Regression', () => {
  beforeEach(() => {
    useStudioStore.setState({
      scene: JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON,
      currentSlideIndex: 0,
      history: [JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON],
      historyIndex: 0,
      saveStatus: 'saved',
      mode: 'slide',
    });
  });

  it('renders StudioApp with initialPackId without hitting Maximum update depth exceeded', () => {
    const { container } = render(<StudioApp initialPackId="basic" />);
    expect(container).toBeDefined();

    // Verify ErrorBoundary did not catch any uncaught errors
    const errorFallback = container.querySelector('.error-boundary-fallback');
    expect(errorFallback).toBeNull();

    // Verify timeline scrubber slider (thanh kéo trượt) is present
    const slider = container.querySelector('#timeline-slider') as HTMLInputElement | null;
    expect(slider).not.toBeNull();
    expect(slider?.type).toBe('range');

    // Verify playback control buttons are present
    const playBtn = container.querySelector('#btn-timeline-play');
    expect(playBtn).not.toBeNull();
  });

  it('renders StudioApp cleanly without initialPackId', () => {
    const { container } = render(<StudioApp />);
    expect(container).toBeDefined();

    const errorFallback = container.querySelector('.error-boundary-fallback');
    expect(errorFallback).toBeNull();

    const slider = container.querySelector('#timeline-slider');
    expect(slider).not.toBeNull();
  });

  it('initializes with a clean empty project (Bài Giảng Mới) instead of sample philosophy fixture when no project is loaded', () => {
    useStudioStore.setState({
      scene: null,
      currentSlideIndex: 0,
      history: [],
      historyIndex: -1,
      saveStatus: 'saved',
      mode: 'slide',
    });

    render(<StudioApp />);
    const currentScene = useStudioStore.getState().scene;
    expect(currentScene).not.toBeNull();
    expect(currentScene?.title).toBe('Bài Giảng Mới');
    expect(currentScene?.slides.length).toBe(1);
    expect(currentScene?.slides[0].title).toBe('Tiêu Đề Bài Giảng Mới');
    // Ensure it is NOT the sample philosophy fixture
    expect(currentScene?.title).not.toContain('Triết học');
  });
});
