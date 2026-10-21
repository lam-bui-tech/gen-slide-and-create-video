'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { recomputeTotalDuration } from '@engine/reducer.js';

export function SlideNavigator() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const setSlideIndex = useStudioStore((s) => s.setSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  if (!scene || !scene.slides) {
    return (
      <aside className="slide-navigator">
        <div className="deck-header">
          <span className="deck-title" id="deck-count-label">Danh Sách Slide (0)</span>
        </div>
        <div className="slide-list-container" id="slide-list-container">
          <div style={{ padding: '20px', color: 'var(--text-sub)', fontSize: '13px', textAlign: 'center' }}>
            Chưa có slide nào.
          </div>
        </div>
      </aside>
    );
  }

  const slides = scene.slides;
  const totalSecs =
    Math.round((scene.totalDurationSeconds || recomputeTotalDuration(slides)) * 10) / 10;
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  const countLabel = `Slide (${slides.length}) · ⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleAddSlide = () => {
    const newSlide = {
      slideId: `slide-${Date.now().toString().slice(-4)}`,
      templateId: 'concept-explain',
      layoutVariant: 'default',
      title: 'Khái Niệm Mới',
      elements: [
        { id: 'card-new', type: 'card', content: 'Nội dung giải thích chi tiết cho khái niệm này.' },
      ],
      animations: [
        { target: '.slide-title', preset: 'fade-in', delay: 0.2, duration: 0.8 },
      ],
      voice: {
        narration: 'Nội dung thuyết minh cho slide mới.',
        provider: 'vieneu',
        voiceId: 'BanMai',
        durationSeconds: 4.0,
      },
      durationSeconds: 5.0,
    };
    dispatch(
      {
        type: 'ADD_SLIDE',
        payload: { index: currentSlideIndex + 1, slide: newSlide },
      },
      'Thêm slide mới'
    );
    setSlideIndex(currentSlideIndex + 1);
  };

  const handleMoveUp = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx > 0) {
      dispatch(
        { type: 'REORDER_SLIDES', payload: { fromIndex: idx, toIndex: idx - 1 } },
        'Di chuyển slide lên'
      );
      setSlideIndex(idx - 1);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx < slides.length - 1) {
      dispatch(
        { type: 'REORDER_SLIDES', payload: { fromIndex: idx, toIndex: idx + 1 } },
        'Di chuyển slide xuống'
      );
      setSlideIndex(idx + 1);
    }
  };

  const handleDuplicate = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const target = slides[idx];
    const clone = JSON.parse(JSON.stringify(target));
    clone.slideId = `slide-${Date.now().toString().slice(-4)}`;
    clone.title = (clone.title || 'Slide') + ' (Bản sao)';
    dispatch(
      { type: 'ADD_SLIDE', payload: { index: idx + 1, slide: clone } },
      'Nhân bản slide'
    );
    setSlideIndex(idx + 1);
  };

  const handleDelete = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    if (window.confirm(`Bạn có chắc muốn xóa slide #${idx + 1}?`)) {
      dispatch({ type: 'DELETE_SLIDE', payload: { slideIndex: idx } }, 'Xóa slide');
      if (currentSlideIndex >= slides.length - 1) {
        setSlideIndex(Math.max(0, slides.length - 2));
      }
    }
  };

  return (
    <aside className="slide-navigator">
      <div className="deck-header">
        <span className="deck-title" id="deck-count-label">{countLabel}</span>
        <button
          className="btn btn-secondary"
          id="btn-add-slide"
          onClick={handleAddSlide}
          style={{ padding: '4px 10px', fontSize: '12px' }}
        >
          + Thêm
        </button>
      </div>

      <div className="slide-list-container" id="slide-list-container">
        {slides.map((s: any, idx: number) => {
          const isActive = idx === currentSlideIndex;
          const templateName = s.templateId || s.layoutId || 'concept-explain';
          const slideTitle =
            s.title || (s.slotValues as any)?.title || (s.slotValues as any)?.heading || `Slide ${idx + 1}`;
          const voiceDuration = s.voice?.durationSeconds || 0;
          const layoutVariant = s.layoutVariant || s.variantId || 'default';

          return (
            <div
              key={s.slideId || idx}
              className={`slide-card-item ${isActive ? 'active' : ''}`}
              onClick={() => setSlideIndex(idx)}
            >
              <div className="slide-card-actions">
                {idx > 0 && (
                  <button
                    className="card-action-btn btn-move-up"
                    title="Lên trên"
                    onClick={(e) => handleMoveUp(e, idx)}
                  >
                    ▲
                  </button>
                )}
                {idx < slides.length - 1 && (
                  <button
                    className="card-action-btn btn-move-down"
                    title="Xuống dưới"
                    onClick={(e) => handleMoveDown(e, idx)}
                  >
                    ▼
                  </button>
                )}
                <button
                  className="card-action-btn btn-dup-slide"
                  title="Nhân bản"
                  onClick={(e) => handleDuplicate(e, idx)}
                >
                  ⎘
                </button>
                {slides.length > 1 && (
                  <button
                    className="card-action-btn delete btn-del-slide"
                    title="Xóa slide"
                    onClick={(e) => handleDelete(e, idx)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="slide-card-meta">
                <span>#{String(idx + 1).padStart(2, '0')} · {templateName}</span>
                <span>{s.durationSeconds || 16}s</span>
              </div>
              <div className="slide-card-title">{slideTitle}</div>
              <div className="slide-card-sub">
                <span>🎙️ {voiceDuration}s</span>
                <span>✦ {layoutVariant}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
