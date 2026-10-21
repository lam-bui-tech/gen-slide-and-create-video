'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function VideoInspector() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);

  const slide = scene?.slides?.[currentSlideIndex];
  const vidEl = slide?.elements?.find((e: any) => e.type === 'video') as any;

  if (!vidEl) return null;

  const handleUpdate = (changes: Record<string, unknown>, label = 'Cập nhật video') => {
    dispatch(
      {
        type: 'UPDATE_ELEMENT',
        payload: {
          slideIndex: currentSlideIndex,
          elementId: vidEl.id,
          changes,
        },
      },
      label
    );
  };

  const handleRemove = () => {
    const remaining = (slide?.elements || []).filter((e: any) => e.id !== vidEl.id);
    dispatch(
      {
        type: 'UPDATE_SLIDE',
        payload: {
          slideIndex: currentSlideIndex,
          changes: { elements: remaining },
        },
      },
      'Gỡ khối video khỏi slide'
    );
  };

  const volume = typeof vidEl.volume === 'number' ? vidEl.volume : 1.0;

  return (
    <div className="prop-section" id="video-component-section">
      <div className="prop-section-title">
        <span>🎬 Khối Video Canvas (P6.3)</span>
        <span
          style={{
            fontSize: '10px',
            background: '#FEF3C7',
            color: '#D97706',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          MP4 / WebM
        </span>
      </div>

      <div className="prop-group">
        <label className="prop-label" htmlFor="video-src-input">
          Nguồn Video (URL / Tệp)
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            id="video-src-input"
            className="prop-input"
            placeholder="storage/projects/.../clip.mp4"
            style={{ flex: 1 }}
            value={vidEl.content || ''}
            onChange={(e) => handleUpdate({ content: e.target.value }, 'Đổi URL video')}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <div>
          <label className="prop-label" htmlFor="video-trim-start">
            Cắt đầu (Trim Start - s)
          </label>
          <input
            type="number"
            id="video-trim-start"
            className="prop-input"
            min={0}
            step={0.1}
            value={vidEl.trimStart ?? 0.0}
            onChange={(e) =>
              handleUpdate({ trimStart: parseFloat(e.target.value) || 0.0 }, 'Chỉnh trim start video')
            }
          />
        </div>
        <div>
          <label className="prop-label" htmlFor="video-trim-end">
            Cắt đuôi (Trim End - s)
          </label>
          <input
            type="number"
            id="video-trim-end"
            className="prop-input"
            min={0.1}
            step={0.1}
            value={vidEl.trimEnd ?? (slide?.durationSeconds || 16.0)}
            onChange={(e) =>
              handleUpdate({ trimEnd: parseFloat(e.target.value) || 16.0 }, 'Chỉnh trim end video')
            }
          />
        </div>
      </div>

      <div className="prop-group">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <label className="prop-label" style={{ marginBottom: 0 }}>
            Âm lượng Video
          </label>
          <span
            id="video-volume-val"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}
          >
            {Math.round(volume * 100)}%
          </span>
        </div>
        <input
          type="range"
          id="video-volume-slider"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) =>
            handleUpdate({ volume: parseFloat(e.target.value) }, 'Chỉnh âm lượng video')
          }
          style={{ width: '100%', accentColor: 'var(--primary)' }}
        />
      </div>

      <div
        className="prop-group"
        style={{
          background: '#F8FAFC',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '8px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            id="video-ducking-checkbox"
            checked={vidEl.ducking !== false}
            onChange={(e) =>
              handleUpdate({ ducking: e.target.checked }, 'Bật/tắt ducking âm lượng')
            }
            style={{ marginTop: '2px' }}
          />
          <span>
            <strong>Ducking âm lượng</strong>: Tự động hạ âm lượng video xuống 0.2 khi có giọng
            thuyết minh của giáo viên.
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <button
          className="btn btn-secondary"
          id="btn-video-remove"
          onClick={handleRemove}
          style={{
            color: '#E11D48',
            width: '100%',
            fontSize: '12px',
            fontWeight: 600,
            borderColor: '#FECDD3',
            background: '#FFF1F2',
          }}
        >
          ✕ Gỡ Khối Video Khỏi Slide
        </button>
      </div>
    </div>
  );
}
