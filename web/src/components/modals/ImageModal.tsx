'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export const SAMPLE_ACADEMIC_IMAGES = [
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80',
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
  'https://images.unsplash.com/photo-1507842229451-7f01be7fe7ab?w=400&q=80',
];

export function ImageModal() {
  const isImageModalOpen = useStudioStore((s) => s.isImageModalOpen);
  const activeImageTargetId = useStudioStore((s) => s.activeImageTargetId);
  const closeImageModal = useStudioStore((s) => s.closeImageModal);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const scene = useStudioStore((s) => s.scene);
  const dispatch = useStudioStore((s) => s.dispatch);

  const [imageUrl, setImageUrl] = useState('');

  if (!isImageModalOpen) return null;

  const handleApply = () => {
    const url = imageUrl.trim();
    if (!url || !scene) {
      closeImageModal();
      return;
    }

    const slide = scene.slides[currentSlideIndex];
    const imgEl = slide?.elements?.find(
      (e: any) => e.type === 'image' || e.id === activeImageTargetId
    );

    if (imgEl) {
      dispatch(
        {
          type: 'UPDATE_ELEMENT',
          payload: {
            slideIndex: currentSlideIndex,
            elementId: imgEl.id,
            changes: { content: url },
          },
        },
        'Đổi ảnh minh họa'
      );
    } else {
      dispatch(
        {
          type: 'SET_MEDIA_SLOT',
          payload: {
            slideIndex: currentSlideIndex,
            mediaUrl: url,
            variant: slide?.layoutVariant === 'no-image' ? 'default' : slide?.layoutVariant,
          },
        },
        'Đổi ảnh minh họa'
      );
    }

    setImageUrl('');
    closeImageModal();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        if (typeof re.target?.result === 'string') {
          setImageUrl(re.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay open" id="image-modal">
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 800,
            color: 'var(--hf-primary, #0369A1)',
            marginBottom: '12px',
          }}
        >
          Thay Ảnh Minh Họa Slide
        </h3>
        <div className="prop-group">
          <label className="prop-label" htmlFor="modal-img-url">
            Đường Dẫn Ảnh (URL hoặc local storage):
          </label>
          <input
            type="text"
            id="modal-img-url"
            className="prop-input"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="prop-group">
          <label className="prop-label" htmlFor="modal-img-file">
            Hoặc tải file ảnh lên từ máy tính:
          </label>
          <input
            type="file"
            id="modal-img-file"
            accept="image/*"
            className="prop-input"
            style={{ padding: '6px' }}
            onChange={handleFileUpload}
          />
        </div>

        <div className="prop-group">
          <label className="prop-label">Kho ảnh mẫu học thuật gợi ý:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {SAMPLE_ACADEMIC_IMAGES.map((src, i) => (
              <div
                key={i}
                className="img-preview-opt"
                onClick={() => setImageUrl(src)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: imageUrl === src ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Sample ${i}`}
                  style={{ width: '100%', height: '75px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button className="btn btn-secondary" id="btn-close-modal" onClick={closeImageModal}>
            Hủy
          </button>
          <button className="btn btn-primary" id="btn-apply-img" onClick={handleApply}>
            Áp Dụng Ảnh
          </button>
        </div>
      </div>
    </div>
  );
}
