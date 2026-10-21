'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function NotesBox() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const [notes, setNotes] = useState(slide?.notes || '');

  useEffect(() => {
    setNotes(slide?.notes || '');
  }, [slide?.notes, currentSlideIndex]);

  const handleBlur = () => {
    if (slide && slide.notes !== notes) {
      dispatch(
        {
          type: 'UPDATE_SLIDE',
          payload: {
            slideIndex: currentSlideIndex,
            changes: { notes },
          },
        },
        'Sửa ghi chú slide'
      );
    }
  };

  return (
    <div className="prop-section">
      <label
        htmlFor="prop-notes-input"
        className="prop-section-title"
        style={{ display: 'block' }}
      >
        Ghi Chú Giảng Viên
      </label>
      <div className="prop-group">
        <textarea
          id="prop-notes-input"
          aria-label="Ghi chú giảng viên"
          className="prop-textarea"
          rows={3}
          placeholder="Ghi chú thêm cho người thuyết trình..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleBlur}
        />
      </div>
    </div>
  );
}
