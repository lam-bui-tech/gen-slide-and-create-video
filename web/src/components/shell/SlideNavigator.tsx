'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { recomputeTotalDuration } from '@engine/reducer.js';

export function SlideNavigator() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const setSlideIndex = useStudioStore((s) => s.setSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut accelerator: Ctrl+K or Cmd+K to focus search (Heuristic 7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!scene || !scene.slides) {
    return (
      <aside className="slide-navigator" aria-label="Danh sách slide bài giảng">
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
    <aside className="slide-navigator" aria-label="Danh sách slide bài giảng">
      <div className="deck-header">
        <span className="deck-title" id="deck-count-label">{countLabel}</span>
        <button
          className="btn btn-secondary"
          id="btn-add-slide"
          aria-label="Thêm slide mới"
          onClick={handleAddSlide}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '32px' }}
        >
          + Thêm
        </button>
      </div>

      <div style={{ padding: '0 10px 10px 10px' }}>
        <input
          type="search"
          id="slide-search-input"
          ref={searchInputRef}
          aria-label="Tìm kiếm slide theo tiêu đề hoặc mẫu"
          placeholder="🔍 Tìm slide... (Ctrl+K)"
          className="prop-input"
          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '6px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="slide-list-container" id="slide-list-container">
        {slides
          .map((s: any, idx: number) => ({ s, idx }))
          .filter(({ s, idx }) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const slideTitle = (s.title || (s.slotValues as any)?.title || (s.slotValues as any)?.heading || '').toLowerCase();
            const templateName = (s.templateId || s.layoutId || '').toLowerCase();
            return (
              slideTitle.includes(q) ||
              templateName.includes(q) ||
              `slide ${idx + 1}`.includes(q) ||
              `#${idx + 1}`.includes(q)
            );
          })
          .map(({ s, idx }) => {
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
                      aria-label={`Di chuyển slide ${idx + 1} lên trên`}
                      onClick={(e) => handleMoveUp(e, idx)}
                    >
                      ▲
                    </button>
                  )}
                  {idx < slides.length - 1 && (
                    <button
                      className="card-action-btn btn-move-down"
                      title="Xuống dưới"
                      aria-label={`Di chuyển slide ${idx + 1} xuống dưới`}
                      onClick={(e) => handleMoveDown(e, idx)}
                    >
                      ▼
                    </button>
                  )}
                  <button
                    className="card-action-btn btn-dup-slide"
                    title="Nhân bản"
                    aria-label={`Nhân bản slide ${idx + 1}`}
                    onClick={(e) => handleDuplicate(e, idx)}
                  >
                    ⎘
                  </button>
                  {slides.length > 1 && (
                    <button
                      className="card-action-btn delete btn-del-slide"
                      title="Xóa slide"
                      aria-label={`Xóa slide ${idx + 1}`}
                      onClick={(e) => handleDelete(e, idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="slide-card-main-btn"
                  aria-label={`Slide ${idx + 1}: ${slideTitle}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideIndex(idx);
                  }}
                >
                  <div className="slide-card-meta">
                    <span>#{String(idx + 1).padStart(2, '0')} · {templateName}</span>
                    <span>{s.durationSeconds || 16}s</span>
                  </div>
                  <div className="slide-card-title">{slideTitle}</div>
                  <div className="slide-card-sub">
                    <span>🎙️ {voiceDuration}s</span>
                    <span>✦ {layoutVariant}</span>
                  </div>
                </button>
              </div>
            );
          })}
      </div>
    </aside>
  );
}
