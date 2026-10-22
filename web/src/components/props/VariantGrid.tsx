'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export const VARIANT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'tree-hierarchy', label: 'Cây Phân Cấp (Tree Hierarchy)' },
  { value: 'contour-numbers', label: 'Số Viền Đồ Họa (Contour Numbers)' },
  { value: 'skewed-badges', label: 'Khối Số 3D (Skewed Badges)' },
  { value: 'visual-anchor', label: 'Neo Biểu Tượng & Danh Mục' },
  { value: 'text-left-image-right', label: 'Chữ Trái - Ảnh Phải' },
  { value: 'text-right-image-left', label: 'Ảnh Trái - Chữ Phải' },
  { value: 'stacked-top', label: 'Banner Trên' },
  { value: 'fullscreen', label: 'Tràn Viền' },
  { value: 'no-image', label: 'Không Có Ảnh' },
];

export function VariantGrid() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const currentVariant = slide?.layoutVariant || slide?.variantId || 'default';

  const handleSelectVariant = (variant: string) => {
    if (variant === currentVariant) return;
    dispatch(
      {
        type: 'UPDATE_SLIDE',
        payload: {
          slideIndex: currentSlideIndex,
          changes: { layoutVariant: variant, variantId: variant },
        },
      },
      'Đổi biến thể layout'
    );
  };

  return (
    <div className="prop-group">
      <label className="prop-label" htmlFor="prop-variant-select">
        Biến Thể Bố Cục (Layout Variant)
      </label>
      <select
        id="prop-variant-select"
        className="prop-select"
        style={{ marginBottom: '8px' }}
        value={currentVariant}
        onChange={(e) => handleSelectVariant(e.target.value)}
      >
        {VARIANT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="variant-grid" id="variant-pills-container">
        {VARIANT_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.value}
            className={`variant-pill ${opt.value === currentVariant ? 'active' : ''}`}
            data-variant={opt.value}
            aria-pressed={opt.value === currentVariant}
            aria-label={`Biến thể ${opt.label}`}
            onClick={() => handleSelectVariant(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
