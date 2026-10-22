'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function CanvasPaneFrame({
  children,
  bottomBar,
}: {
  children?: React.ReactNode;
  bottomBar?: React.ReactNode;
}) {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const setSlideIndex = useStudioStore((s) => s.setSlideIndex);
  const mode = useStudioStore((s) => s.mode);
  const toggleBuilderMode = useStudioStore((s) => s.toggleBuilderMode);

  const totalSlides = scene?.slides?.length || 0;
  const canPrev = currentSlideIndex > 0;
  const canNext = currentSlideIndex < totalSlides - 1;

  const currentSlide = scene?.slides?.[currentSlideIndex];
  const templateBadge = currentSlide
    ? `${currentSlide.templateId || 'concept-explain'} (${currentSlide.layoutVariant || 'default'})`
    : '';

  return (
    <main className="studio-canvas-pane">
      {/* Canvas Topbar */}
      <div className="canvas-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-icon"
            id="btn-prev-slide"
            aria-label="Chuyển về slide trước"
            onClick={() => setSlideIndex(currentSlideIndex - 1)}
            disabled={!canPrev}
            title="Slide trước (←)"
            style={{ opacity: canPrev ? 1 : 0.4, cursor: canPrev ? 'pointer' : 'not-allowed', minWidth: '32px', minHeight: '32px' }}
          >
            ◀
          </button>
          <span
            id="canvas-slide-indicator"
            style={{ fontSize: '13px', fontWeight: 700, minWidth: '100px', textAlign: 'center' }}
          >
            Slide {totalSlides > 0 ? currentSlideIndex + 1 : 0} / {totalSlides}
          </span>
          <button
            className="btn btn-secondary btn-icon"
            id="btn-next-slide"
            aria-label="Chuyển sang slide tiếp theo"
            onClick={() => setSlideIndex(currentSlideIndex + 1)}
            disabled={!canNext}
            title="Slide tiếp (→)"
            style={{ opacity: canNext ? 1 : 0.4, cursor: canNext ? 'pointer' : 'not-allowed', minWidth: '32px', minHeight: '32px' }}
          >
            ▶
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-sub)' }}>
          {templateBadge && (
            <span
              id="canvas-template-badge"
              style={{
                background: '#F1F5F9',
                border: '1px solid var(--border-color)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
            >
              {templateBadge}
            </span>
          )}

          <button
            className="btn btn-secondary"
            id="btn-toggle-builder-mode"
            onClick={() => toggleBuilderMode()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              minHeight: '28px',
              fontSize: '12px',
              fontWeight: 600,
              background: mode === 'builder' ? '#E0F2FE' : '#FFFFFF',
              borderColor: mode === 'builder' ? '#0284C7' : 'var(--border-color)',
              color: mode === 'builder' ? '#0369A1' : 'inherit',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {mode === 'builder' ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Thoát Builder</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                </svg>
                <span>Chế Độ Builder</span>
              </>
            )}
          </button>
          <span>Độ phân giải: <strong>1920 × 1080 (16:9)</strong></span>
        </div>
      </div>

      {/* Center Viewport Stage Area */}
      <div className="canvas-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>

      {/* Bottom Timeline Bar */}
      {bottomBar}
    </main>
  );
}
