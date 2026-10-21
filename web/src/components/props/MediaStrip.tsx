'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

interface MediaCandidate {
  url: string;
  type: string;
  label?: string;
}

const DEFAULT_CANDIDATES: MediaCandidate[] = [
  {
    url: 'storage/projects/proj-1281288d/images/rect_geometry.jpg',
    type: 'document',
    label: '📐 Hình Chữ Nhật',
  },
  {
    url: 'storage/projects/proj-1281288d/images/grid_area.jpg',
    type: 'diagram',
    label: '📊 Lưới Diện Tích (Grid)',
  },
  {
    url: 'storage/projects/proj-1281288d/images/area_vs_perimeter.svg',
    type: 'vector',
    label: '⚡ Sơ Đồ Vector SVG',
  },
  {
    url: 'storage/projects/proj-1281288d/images/intro_cover.jpg',
    type: 'stock',
    label: '🎨 Minh Họa Nghệ Thuật',
  },
];

export function MediaStrip() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);
  const openImageModal = useStudioStore((s) => s.openImageModal);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<MediaCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  const slide = scene?.slides?.[currentSlideIndex];
  const visualNeed = (slide as any)?.visualNeed || 'diagram';

  useEffect(() => {
    if (!scene || !slide) return;
    let cancelled = false;
    setLoading(true);

    api.getMediaRecommendations(scene.projectId, slide.slideId)
      .then((data) => {
        if (!cancelled) {
          if (Array.isArray(data) && data.length > 0) {
            setCandidates(data);
          } else {
            setCandidates(DEFAULT_CANDIDATES);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates(DEFAULT_CANDIDATES);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scene, slide]);

  const handleApplyCandidate = (c: MediaCandidate) => {
    if (!slide) return;
    const variant = slide.layoutVariant === 'no-image' ? 'default' : slide.layoutVariant;
    dispatch(
      {
        type: 'SET_MEDIA_SLOT',
        payload: {
          slideIndex: currentSlideIndex,
          mediaUrl: c.url,
          variant,
        },
      },
      'Áp dụng ảnh gợi ý 1-chạm'
    );
  };

  const handleRemoveMedia = () => {
    dispatch(
      {
        type: 'SET_MEDIA_SLOT',
        payload: {
          slideIndex: currentSlideIndex,
          mediaUrl: '',
          variant: 'no-image',
        },
      },
      'Xóa ảnh minh họa'
    );
  };

  const handleInsertVideo = () => {
    if (!slide) return;
    dispatch(
      {
        type: 'UPDATE_ELEMENT',
        payload: {
          slideIndex: currentSlideIndex,
          elementId: 'vid-block-01',
          changes: {
            id: 'vid-block-01',
            type: 'video',
            content: 'storage/projects/sample/video/sample_clip.mp4',
            trimStart: 0.0,
            trimEnd: slide.durationSeconds || 16.0,
            volume: 1.0,
            ducking: true,
          },
        },
      },
      'Chèn khối video vào slide'
    );
  };

  return (
    <div className="prop-section" id="media-strip-section">
      <div className="prop-section-title">
        <span>Khối Hình Ảnh / Media Strip</span>
        <span
          id="media-visual-need-badge"
          style={{
            fontSize: '10px',
            background: '#E0F2FE',
            color: '#0369A1',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          {visualNeed}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <button
          className="btn btn-secondary"
          id="btn-media-strip-upload"
          onClick={() => openImageModal()}
          style={{ flex: 1, padding: '6px 8px', fontSize: '12px', fontWeight: 600 }}
        >
          📁 Tải Ảnh Lên
        </button>
        <button
          className="btn btn-secondary"
          id="btn-media-strip-video"
          onClick={handleInsertVideo}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#0284C7',
            borderColor: '#BAE6FD',
          }}
        >
          🎬 Chèn Video
        </button>
        <button
          className="btn btn-secondary"
          id="btn-media-strip-remove"
          onClick={handleRemoveMedia}
          style={{ color: '#E11D48', padding: '6px 10px', fontSize: '12px', fontWeight: 600 }}
          title="Xóa ảnh và chuyển sang bố cục no-image"
        >
          ✕ Xóa
        </button>
      </div>

      <input
        type="file"
        id="media-strip-file-input"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>
          Gợi ý ứng viên (1-chạm để áp dụng):
        </span>
      </div>

      <div
        id="media-recommendations-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}
      >
        {loading ? (
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', gridColumn: 'span 2' }}>
            Đang nạp gợi ý...
          </div>
        ) : (
          candidates.slice(0, 4).map((c, i) => (
            <div
              key={i}
              onClick={() => handleApplyCandidate(c)}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'white',
                transition: 'all 0.15s',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.url}
                alt={c.label || 'Candidate'}
                style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/400x300/e2e8f0/475569?text=Image';
                }}
              />
              <div
                style={{
                  padding: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: '#F8FAFC',
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.label || c.type || 'Ứng viên'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
