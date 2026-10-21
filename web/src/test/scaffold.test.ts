import { describe, it, expect } from 'vitest';
import { sceneReducer } from '@engine/reducer.js';
import { renderSlide } from '@templates/index.js';

describe('F1 Scaffold Verification', () => {
  it('imports sceneReducer from @engine/reducer.js and handles actions', () => {
    const initialState = {
      projectId: 'test-proj',
      title: 'Initial Title',
      slides: [
        {
          slideId: 'slide-01',
          templateId: 'concept-explain',
          layoutVariant: 'default',
          title: 'Slide 1',
          elements: [],
          animations: [],
          voice: { narration: 'Hello', voiceId: 'BanMai', durationSeconds: 2.0 },
          durationSeconds: 3.0,
        },
      ],
    };

    const nextState = sceneReducer(initialState, {
      type: 'UPDATE_SLIDE',
      payload: {
        slideIndex: 0,
        changes: { title: 'Updated Title' },
      },
    });

    expect(nextState.slides[0].title).toBe('Updated Title');
  });

  it('imports renderSlide from @templates/index.js and produces valid HTML string', () => {
    const sampleSlide = {
      slideId: 'slide-01',
      templateId: 'title-slide',
      layoutVariant: 'default',
      title: 'Khái Luận Triết Học',
      subtitle: 'Thế giới quan và phương pháp luận',
      elements: [
        { id: 'txt-author', type: 'text', content: 'Giảng viên AI' },
      ],
      animations: [],
      voice: { narration: 'Giới thiệu', voiceId: 'BanMai', durationSeconds: 2.0 },
      durationSeconds: 4.0,
    };

    const html = renderSlide(sampleSlide, 0, 4.0);
    expect(typeof html).toBe('string');
    expect(html).toContain('Khái Luận Triết Học');
    expect(html).toContain('hf-template-title-slide');
  });
});
