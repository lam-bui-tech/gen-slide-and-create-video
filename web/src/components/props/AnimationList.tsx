'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export const QUICK_PRESETS = [
  { preset: 'fade-in', label: '🌟 Hiện Mượt (Fade In)' },
  { preset: 'slide-in', label: '🚀 Trượt Vào (Slide Up)' },
  { preset: 'zoom-in', label: '🎯 Phóng To (Zoom/Pop)' },
  { preset: 'typewriter', label: '⌨️ Đánh Máy (Typewriter)' },
];

export function AnimationList() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const animations = slide?.animations || [];

  const handleApplyQuickPreset = (preset: string) => {
    if (!slide) return;
    let target = '.slide-title';
    if (slide.templateId === 'title-slide') target = '.title-hero-heading';
    else if (slide.templateId === 'concept-explain') target = '.concept-card';
    else if (slide.templateId === 'image-explain') target = '.explain-image-wrap';
    else if (slide.templateId === 'bullet-breakdown') target = '.breakdown-card';

    dispatch(
      {
        type: 'SET_ANIMATION',
        payload: {
          slideIndex: currentSlideIndex,
          animIndex: 0,
          animation: {
            target,
            preset,
            delay: 0.3,
            duration: 0.8,
            easing: 'power2.out',
          },
        },
      },
      `Áp dụng hiệu ứng ${preset}`
    );
  };

  const handleAddCustomAnimation = () => {
    dispatch(
      {
        type: 'SET_ANIMATION',
        payload: {
          slideIndex: currentSlideIndex,
          animIndex: animations.length,
          animation: {
            target: '.slide-title',
            preset: 'fade-in',
            delay: 0.5,
            duration: 1.0,
            easing: 'power2.out',
          },
        },
      },
      'Thêm hiệu ứng hoạt họa'
    );
  };

  return (
    <div className="prop-section">
      <div className="prop-section-title">
        <span>✨ Hoạt Họa & Chuyển Động</span>
        <button
          className="btn btn-secondary"
          id="btn-add-anim"
          onClick={handleAddCustomAnimation}
          style={{ padding: '2px 8px', fontSize: '11px' }}
        >
          + Tùy biến
        </button>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '8px' }}>
        Bộ hiệu ứng 1-chạm (nhấn để áp dụng ngay vào slide):
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
          marginBottom: '12px',
        }}
      >
        {QUICK_PRESETS.map((p) => (
          <button
            key={p.preset}
            className="btn btn-secondary btn-quick-anim"
            data-preset={p.preset}
            onClick={() => handleApplyQuickPreset(p.preset)}
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              justifyContent: 'flex-start',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#475569',
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Hiệu Ứng Trên Slide Hiện Tại ({animations.length}):</span>
        <span style={{ fontSize: '10px', fontWeight: 400, color: '#64748B' }}>
          Bấm ▶ để xem thử
        </span>
      </div>

      <div id="anim-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {animations.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontStyle: 'italic' }}>
            Chưa có hoạt họa nào được cấu hình cho slide này.
          </div>
        ) : (
          animations.map((anim, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: '#F8FAFC',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--primary)' }}>{anim.preset}</strong>
                <span style={{ color: 'var(--text-sub)', marginLeft: '6px' }}>
                  {anim.target}
                </span>
              </div>
              <span style={{ color: '#64748B', fontSize: '10px', flexShrink: 0 }}>
                +{anim.delay}s ({anim.duration}s)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
