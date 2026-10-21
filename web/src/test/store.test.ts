import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from '@/store/useStudioStore';
import type { LessonSceneJSON } from '@schemas/types';

const sampleSceneFixture: LessonSceneJSON = {
  schemaVersion: 2,
  projectId: 'proj-unit-test',
  title: 'Bài Giảng Mẫu',
  packId: 'basic',
  slides: [
    {
      slideId: 'slide-01',
      templateId: 'title-slide',
      variantId: 'default',
      layoutVariant: 'default',
      title: 'Tiêu Đề Ban Đầu',
      subtitle: 'Phụ đề',
      slotValues: {},
      media: [],
      elements: [{ id: 'txt-author', type: 'text', content: 'Giảng viên' }],
      animations: [],
      voice: { narration: 'Lời mở đầu', provider: 'vieneu', voiceId: 'BanMai', durationSeconds: 3.0 },
      durationSeconds: 4.0,
    },
    {
      slideId: 'slide-02',
      templateId: 'concept-explain',
      variantId: 'default',
      layoutVariant: 'default',
      title: 'Khái Niệm',
      slotValues: {},
      media: [],
      elements: [{ id: 'card-desc', type: 'card', content: 'Mô tả khái niệm' }],
      animations: [],
      voice: { narration: 'Giải thích', provider: 'vieneu', voiceId: 'BanMai', durationSeconds: 5.0 },
      durationSeconds: 6.0,
    },
  ],
  totalDurationSeconds: 10.0,
};

describe('useStudioStore Unit Tests', () => {
  beforeEach(() => {
    useStudioStore.getState().setScene(sampleSceneFixture);
  });

  it('initializes with correct scene and history', () => {
    const state = useStudioStore.getState();
    expect(state.scene?.title).toBe('Bài Giảng Mẫu');
    expect(state.currentSlideIndex).toBe(0);
    expect(state.history.length).toBe(1);
    expect(state.historyIndex).toBe(0);
    expect(state.saveStatus).toBe('saved');
  });

  it('dispatches UPDATE_SLIDE, updates slide title and records history', () => {
    const store = useStudioStore.getState();
    store.dispatch(
      {
        type: 'UPDATE_SLIDE',
        payload: { slideIndex: 0, changes: { title: 'Tiêu Đề Mới' } },
      },
      'Sửa tiêu đề slide 1'
    );

    const updated = useStudioStore.getState();
    expect(updated.scene?.slides[0].title).toBe('Tiêu Đề Mới');
    expect(updated.history.length).toBe(2);
    expect(updated.historyIndex).toBe(1);
    expect(updated.saveStatus).toBe('saving');
    expect(updated.actionLog[0].name).toBe('Sửa tiêu đề slide 1');
  });

  it('supports undo and redo accurately', () => {
    const store = useStudioStore.getState();

    // 1st change
    store.dispatch({
      type: 'UPDATE_SLIDE',
      payload: { slideIndex: 0, changes: { title: 'Tiêu Đề Lần 1' } },
    });
    // 2nd change
    store.dispatch({
      type: 'UPDATE_SLIDE',
      payload: { slideIndex: 0, changes: { title: 'Tiêu Đề Lần 2' } },
    });

    expect(useStudioStore.getState().scene?.slides[0].title).toBe('Tiêu Đề Lần 2');
    expect(useStudioStore.getState().historyIndex).toBe(2);

    // Undo to 1st change
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().scene?.slides[0].title).toBe('Tiêu Đề Lần 1');
    expect(useStudioStore.getState().historyIndex).toBe(1);

    // Undo to initial
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().scene?.slides[0].title).toBe('Tiêu Đề Ban Đầu');
    expect(useStudioStore.getState().historyIndex).toBe(0);

    // Redo to 1st change
    useStudioStore.getState().redo();
    expect(useStudioStore.getState().scene?.slides[0].title).toBe('Tiêu Đề Lần 1');
    expect(useStudioStore.getState().historyIndex).toBe(1);

    // Redo to 2nd change
    useStudioStore.getState().redo();
    expect(useStudioStore.getState().scene?.slides[0].title).toBe('Tiêu Đề Lần 2');
    expect(useStudioStore.getState().historyIndex).toBe(2);
  });

  it('bounds checks slide index selection', () => {
    const store = useStudioStore.getState();
    store.setSlideIndex(1);
    expect(useStudioStore.getState().currentSlideIndex).toBe(1);

    // Out of bounds - should not change
    store.setSlideIndex(-1);
    expect(useStudioStore.getState().currentSlideIndex).toBe(1);
    store.setSlideIndex(99);
    expect(useStudioStore.getState().currentSlideIndex).toBe(1);
  });

  it('creates clean new project with createNewEmptyProject', () => {
    const store = useStudioStore.getState();
    store.createNewEmptyProject();

    const state = useStudioStore.getState();
    expect(state.scene?.title).toBe('Bài Giảng Mới');
    expect(state.scene?.slides.length).toBe(1);
    expect(state.history.length).toBe(1);
    expect(state.historyIndex).toBe(0);
    expect(state.mode).toBe('slide');
  });
});
