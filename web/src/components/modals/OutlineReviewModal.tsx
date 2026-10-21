'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import {
  updateOutlineSlide,
  addOutlineSlide,
  removeOutlineSlide,
  reorderOutlineSlides,
} from '@engine/outline_editor.js';
import { api } from '@/lib/api';
import type { LessonOutline } from '@schemas/types';

export const OUTLINE_LAYOUT_OPTIONS = [
  { id: 'title-slide', name: '1. Tiêu Đề' },
  { id: 'learning-objectives', name: '2. Mục Tiêu' },
  { id: 'concept-explain', name: '3. Khái Niệm' },
  { id: 'bullet-breakdown', name: '4. Phân Tích' },
  { id: 'image-explain', name: '5. Sơ Đồ Trực Quan' },
  { id: 'comparison', name: '6. So Sánh' },
  { id: 'timeline', name: '7. Tiến Trình' },
  { id: 'formula-explain', name: '8. Công Thức' },
  { id: 'quiz', name: '9. Trắc Nghiệm' },
  { id: 'summary', name: '10. Tổng Kết' },
];

export function OutlineReviewModal() {
  const isOutlineReviewOpen = useStudioStore((s) => s.isOutlineReviewOpen);
  const pendingOutline = useStudioStore((s) => s.pendingOutline);
  const closeOutlineReviewModal = useStudioStore((s) => s.closeOutlineReviewModal);
  const setUploadProgress = useStudioStore((s) => s.setUploadProgress);
  const setScene = useStudioStore((s) => s.setScene);
  const scene = useStudioStore((s) => s.scene);
  const currentUploadProjectId = useStudioStore((s) => s.currentUploadProjectId);

  const [currentOutline, setCurrentOutline] = useState<LessonOutline | null>(null);

  useEffect(() => {
    if (pendingOutline) {
      setCurrentOutline(JSON.parse(JSON.stringify(pendingOutline)));
    }
  }, [pendingOutline]);

  if (!isOutlineReviewOpen || !currentOutline) return null;

  const slides = currentOutline.slides || [];

  const handleUpdateTitle = (idx: number, newTitle: string) => {
    setCurrentOutline(updateOutlineSlide(currentOutline, idx, { title: newTitle }));
  };

  const handleUpdateLayout = (idx: number, newLayoutId: string) => {
    setCurrentOutline(updateOutlineSlide(currentOutline, idx, { layoutId: newLayoutId }));
  };

  const handleMoveUp = (idx: number) => {
    if (idx > 0) {
      setCurrentOutline(reorderOutlineSlides(currentOutline, idx, idx - 1));
    }
  };

  const handleMoveDown = (idx: number) => {
    if (idx < slides.length - 1) {
      setCurrentOutline(reorderOutlineSlides(currentOutline, idx, idx + 1));
    }
  };

  const handleDelete = (idx: number) => {
    if (slides.length <= 1) return;
    setCurrentOutline(removeOutlineSlide(currentOutline, idx));
  };

  const handleAddSlide = () => {
    setCurrentOutline(
      addOutlineSlide(currentOutline, {
        title: 'Slide Mới',
        layoutId: 'concept-explain',
        visualNeed: 'diagram',
      })
    );
  };

  const handleApprove = async () => {
    closeOutlineReviewModal();
    const projectId = (currentOutline as any).projectId || currentUploadProjectId || scene?.projectId || 'sample';

    setUploadProgress({
      isOpen: true,
      step: 'Đang phê duyệt dàn bài...',
      percent: 50,
      desc: 'Lưu trạng thái dàn bài và khởi tạo bố cục slide...',
      icon: '⏳',
    });

    try {
      // Ensure status is explicitly approved before sending
      const approvedPayload: LessonOutline = {
        ...currentOutline,
        status: 'approved' as const,
      };

      await api.approveOutline(projectId, approvedPayload);

      setUploadProgress({
        isOpen: true,
        step: 'Đang tạo slide tương tác...',
        percent: 85,
        desc: 'Khởi tạo bố cục và hiệu ứng hoạt họa từ dàn bài đã duyệt...',
        icon: '🎨',
      });

      const newScene = await api.generateSceneFromOutline(projectId);

      setUploadProgress({
        step: '✅ Hoàn tất bóc tách!',
        percent: 100,
        desc: 'Đang nạp slide vào phòng biên tập Studio...',
        icon: '✅',
      });

      setTimeout(() => {
        setUploadProgress({ isOpen: false });
        setScene(newScene);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OutlineReviewModal] Approve & Generate failed:', err);
      setUploadProgress({
        isOpen: true,
        step: 'Tạo slide thất bại',
        percent: 0,
        desc: msg,
        icon: '⚠️',
      });
    }
  };

  return (
    <div id="outline-review-modal" className="modal-overlay open">
      <div
        className="modal-box"
        style={{
          width: '880px',
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: 'var(--primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📋</span> Duyệt & Tinh Chỉnh Dàn Bài Sư Phạm (Outline Review)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '4px', marginBottom: 0 }}>
              Tùy chỉnh bố cục (Layouts) và tiêu đề cho từng slide trước khi hệ thống sinh nội dung chi tiết.
            </p>
          </div>
          <button
            id="btn-outline-add-slide"
            className="btn btn-secondary"
            onClick={handleAddSlide}
            style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 600 }}
          >
            + Thêm Slide
          </button>
        </div>

        <div
          id="outline-slides-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            padding: '4px',
            maxHeight: '52vh',
          }}
        >
          {slides.map((s, idx) => {
            const slideItem = s as any;
            return (
              <div
                key={slideItem.slideIndex ?? slideItem.slideId ?? idx}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '13px',
                    color: 'var(--primary)',
                    minWidth: '26px',
                  }}
                >
                  #{idx + 1}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    className="prop-input outline-slide-title"
                    value={s.title || ''}
                    onChange={(e) => handleUpdateTitle(idx, e.target.value)}
                    placeholder="Tiêu đề slide..."
                    style={{ fontWeight: 600 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>
                      Bố cục (Layout):
                    </span>
                    <select
                      className="prop-select outline-slide-layout"
                      style={{ padding: '4px 8px', fontSize: '12px', width: '220px' }}
                      value={slideItem.layoutId || slideItem.suggestedLayoutId || 'concept-explain'}
                      onChange={(e) => handleUpdateLayout(idx, e.target.value)}
                    >
                      {OUTLINE_LAYOUT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#E0F2FE',
                        color: '#0369A1',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {slideItem.visualNeed || 'none'}
                    </span>
                  </div>
                </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  className="btn btn-secondary btn-icon btn-move-up"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  title="Di chuyển lên"
                >
                  ▲
                </button>
                <button
                  className="btn btn-secondary btn-icon btn-move-down"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  disabled={idx === slides.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  title="Di chuyển xuống"
                >
                  ▼
                </button>
              </div>
              <button
                className="btn btn-secondary btn-icon btn-delete-slide"
                style={{ color: '#E11D48', padding: '6px' }}
                onClick={() => handleDelete(idx)}
                title="Xóa slide"
              >
                ✕
              </button>
            </div>
          );
        })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
            marginTop: '16px',
          }}
        >
          <span
            id="outline-slide-count-hint"
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}
          >
            Tổng số: {slides.length} slides
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="btn-outline-quick-approve"
              className="btn btn-secondary"
              onClick={handleApprove}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Duyệt Mặc Định
            </button>
            <button
              id="btn-outline-approve"
              className="btn btn-primary"
              onClick={handleApprove}
              style={{ padding: '8px 22px', fontSize: '13px', fontWeight: 700 }}
            >
              🚀 Phê Duyệt & Sinh Bài Giảng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
