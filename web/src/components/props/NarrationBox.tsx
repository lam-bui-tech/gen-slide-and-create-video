'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function NarrationBox() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const initialNarration = slide?.voice?.narration || '';
  const [localText, setLocalText] = useState(initialNarration);

  useEffect(() => {
    setLocalText(slide?.voice?.narration || '');
  }, [slide?.voice?.narration, currentSlideIndex]);

  const words = localText ? localText.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = localText ? localText.length : 0;
  const estSecs = Math.max(1, Math.round(words / 3.2)); // ~3.2 Vietnamese words/sec

  const handleBlur = () => {
    if (slide && slide.voice?.narration !== localText) {
      dispatch(
        {
          type: 'UPDATE_VOICE',
          payload: {
            slideIndex: currentSlideIndex,
            changes: { narration: localText },
          },
        },
        'Sửa lời thuyết minh'
      );
    }
  };

  return (
    <div className="prop-group">
      <label className="prop-label" htmlFor="prop-narration-input">
        Kịch Bản Thuyết Minh (Vietnamese Narration)
      </label>
      <textarea
        id="prop-narration-input"
        className="prop-textarea"
        rows={4}
        placeholder="Nhập lời giảng chi tiết bằng tiếng Việt..."
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleBlur}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748B',
          marginTop: '4px',
        }}
      >
        <span id="narration-char-count">
          {words} từ · {chars} ký tự
        </span>
        <span id="narration-est-time">Ước tính: ~{estSecs}s</span>
      </div>
    </div>
  );
}
