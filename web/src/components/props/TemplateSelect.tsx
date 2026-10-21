'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export const TEMPLATE_OPTIONS = [
  { value: 'title-slide', label: '1. Slide Tiêu Đề (title-slide)' },
  { value: 'learning-objectives', label: '2. Mục Tiêu Bài Học (learning-objectives)' },
  { value: 'concept-explain', label: '3. Giải Thích Khái Niệm (concept-explain)' },
  { value: 'bullet-breakdown', label: '4. Phân Tích Luận Điểm (bullet-breakdown)' },
  { value: 'image-explain', label: '5. Sơ Đồ Trực Quan (image-explain)' },
  { value: 'comparison', label: '6. So Sánh Đối Chiếu (comparison)' },
  { value: 'timeline', label: '7. Trục Tiến Trình (timeline)' },
  { value: 'formula-explain', label: '8. Công Thức & Định Lý (formula-explain)' },
  { value: 'quiz', label: '9. Câu Hỏi Tương Tác (quiz)' },
  { value: 'summary', label: '10. Tổng Kết Bài Học (summary)' },
];

export function TemplateSelect() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const currentTemplate = slide?.templateId || slide?.layoutId || 'concept-explain';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value;
    dispatch(
      {
        type: 'UPDATE_SLIDE',
        payload: {
          slideIndex: currentSlideIndex,
          changes: {
            templateId: newTemplate,
            layoutId: newTemplate,
            layoutVariant: 'default',
            variantId: 'default',
          },
        },
      },
      'Đổi layout template'
    );
  };

  return (
    <div className="prop-group">
      <label className="prop-label" htmlFor="prop-template-select">
        Mẫu Thiết Kế (Template)
      </label>
      <select
        id="prop-template-select"
        className="prop-select"
        value={currentTemplate}
        onChange={handleChange}
      >
        {TEMPLATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
