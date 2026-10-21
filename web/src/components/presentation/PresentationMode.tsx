'use client';

import React, { useRef } from 'react';
import { usePresentation } from '@/hooks/usePresentation';

export function PresentationMode() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const {
    isPresentationActive,
    presentationIndex,
    totalSlides,
    presentationIsPlaying,
    currentTimeStr,
    totalTimeStr,
    isHudHidden,
    stageScale,
    resetHudTimer,
    togglePlayPause,
    nextSlide,
    prevSlide,
    toggleFullscreen,
    closePresentationMode,
  } = usePresentation(stageRef, containerRef);

  if (!isPresentationActive) return null;

  return (
    <div
      className="presentation-modal"
      id="presentation-modal"
      ref={containerRef}
      onMouseMove={resetHudTimer}
      style={{ display: 'flex' }}
    >
      <div className="presentation-viewport" id="presentation-viewport">
        <div
          className="presentation-slide-stage"
          id="presentation-slide-stage"
          ref={stageRef}
          style={{ transform: `scale(${stageScale})` }}
        />
      </div>

      {/* Floating HUD Controller */}
      <div className={`presentation-hud ${isHudHidden ? 'hidden' : ''}`} id="presentation-hud">
        <div className="hud-left" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="hud-btn"
            id="pres-btn-prev"
            title="Slide trước (← / PageUp)"
            onClick={prevSlide}
            disabled={presentationIndex <= 0}
            style={{ opacity: presentationIndex <= 0 ? 0.4 : 1, cursor: presentationIndex <= 0 ? 'not-allowed' : 'pointer' }}
          >
            ◀
          </button>
          <button
            className="hud-btn primary"
            id="pres-btn-play"
            title="Phát / Tạm dừng (Space)"
            onClick={togglePlayPause}
          >
            {presentationIsPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="hud-btn"
            id="pres-btn-next"
            title="Slide tiếp theo (→ / PageDown)"
            onClick={nextSlide}
            disabled={presentationIndex >= totalSlides - 1}
            style={{ opacity: presentationIndex >= totalSlides - 1 ? 0.4 : 1, cursor: presentationIndex >= totalSlides - 1 ? 'not-allowed' : 'pointer' }}
          >
            ▶
          </button>
        </div>

        <div className="hud-center" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span id="pres-slide-indicator" style={{ fontWeight: 700, color: '#38BDF8' }}>
            Slide {presentationIndex + 1} / {totalSlides}
          </span>
          <span style={{ color: '#64748B' }}>|</span>
          <span id="pres-timer-current" style={{ color: '#F8FAFC' }}>
            {currentTimeStr}
          </span>
          <span style={{ color: '#64748B' }}>/</span>
          <span id="pres-timer-total" style={{ color: '#94A3B8' }}>
            {totalTimeStr}
          </span>
        </div>

        <div className="hud-right" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="hud-btn"
            id="pres-btn-fullscreen"
            title="Toàn màn hình (F)"
            onClick={toggleFullscreen}
          >
            ⛶
          </button>
          <button
            className="hud-btn danger"
            id="pres-btn-close"
            title="Thoát trình chiếu (Esc)"
            onClick={closePresentationMode}
          >
            ✕ Thoát
          </button>
        </div>
      </div>
    </div>
  );
}
