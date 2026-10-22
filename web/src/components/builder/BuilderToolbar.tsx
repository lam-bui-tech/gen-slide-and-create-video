'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { addDraftBlock, validateDraftLayout, exportLayoutForSave } from '@engine/builder.js';
import { api } from '@/lib/api';

export function BuilderToolbar() {
  const draftLayout = useStudioStore((s) => s.draftLayout);
  const setDraftLayout = useStudioStore((s) => s.setDraftLayout);
  const setActiveBuilderElementId = useStudioStore((s) => s.setActiveBuilderElementId);
  const scene = useStudioStore((s) => s.scene);

  const handleAddBlock = (type: string) => {
    if (!draftLayout) return;
    const count = (draftLayout.elements?.length || 0) + 1;
    const newBlock = {
      id: `${type}-${Date.now().toString().slice(-4)}`,
      type,
      x: 100 + (count % 5) * 40,
      y: 100 + (count % 5) * 40,
      width:
        type === 'split' ? 720 :
          type === 'steps' ? 680 :
            type === 'card' ? 560 :
              type === 'kinetic' ? 580 :
                type === 'callout' ? 540 :
                  type === 'image' ? 480 :
                    type === 'video' ? 520 :
                      type === 'stat' ? 360 : 400,
      height:
        type === 'split' ? 260 :
          type === 'card' ? 320 :
            type === 'image' ? 360 :
              type === 'video' ? 300 :
                type === 'steps' ? 180 :
                  type === 'stat' ? 180 :
                    type === 'callout' ? 160 :
                      type === 'kinetic' ? 120 : 80,
      content:
        type === 'text'
          ? 'Nhập nội dung văn bản mới...'
          : type === 'badge'
            ? 'HUY HIỆU'
            : type === 'image'
              ? 'https://placehold.co/600x400/e2e8f0/475569?text=Image'
              : type === 'video'
                ? 'storage/projects/sample/video/sample_clip.mp4'
                : type === 'stat'
                  ? '99.5% Độ Chính Xác Nhận Dạng'
                  : type === 'callout'
                    ? '💡 Trích Dẫn: Khái niệm cốt lõi cần liên hệ thực tiễn sinh viên.'
                    : type === 'split'
                      ? '⚖️ Cột A (Truyền Thống) ⟷ Cột B (Thế Hệ Mới)'
                      : type === 'steps'
                        ? '🚀 Bước 1: Khởi tạo ➔ Bước 2: Huấn luyện ➔ Bước 3: Đánh giá'
                        : type === 'kinetic'
                          ? '✨ TRÍ TUỆ NHÂN TẠO THẾ HỆ MỚI'
                          : '',
    };
    const nextDraft = addDraftBlock(draftLayout, newBlock);
    setDraftLayout(nextDraft);
    setActiveBuilderElementId(newBlock.id);
  };

  const handleSaveToPack = async () => {
    if (!draftLayout) return;

    // Chuẩn hóa layout id và tên nếu bị thiếu hoặc không đúng định dạng
    const rawId =
      typeof draftLayout.id === 'string' && draftLayout.id.trim()
        ? draftLayout.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        : `custom-layout-${Date.now().toString().slice(-4)}`;

    const normalizedDraft = {
      ...draftLayout,
      id: rawId,
      name: draftLayout.name || 'Bố Cục Tùy Biến',
    };

    const validation = validateDraftLayout(normalizedDraft);
    if (!validation.valid) {
      alert(`Không thể lưu layout:\n${validation.errors.join('\n')}`);
      return;
    }

    // Nếu pack hiện tại là 'basic' (mặc định chỉ đọc), tự động lưu vào pack tùy biến 'custom-pack'
    let packId = (scene as any)?.templatePackId || scene?.packId || 'custom-pack';
    if (packId === 'basic') {
      packId = 'custom-pack';
    }

    try {
      const exported = exportLayoutForSave(normalizedDraft);
      await api.saveLayoutToPack(packId, exported);
      setDraftLayout(normalizedDraft);
      alert(`✅ Đã lưu layout "${normalizedDraft.name}" vào bộ mẫu [${packId}] thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi lưu layout vào bộ mẫu: ${msg}`);
    }
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 9px',
    fontSize: '11.5px',
    fontWeight: 500,
    color: '#334155',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  return (
    <div
      id="builder-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: '6px',
        padding: '6px 16px',
        background: '#FFFFFF',
        color: '#0F172A',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        flexShrink: 0,
        zIndex: 20,
        whiteSpace: 'nowrap',
      }}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1 select-none flex-shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span style={{ color: '#0369A1', fontWeight: 700, whiteSpace: 'nowrap' }}>Thêm Khối:</span>
      </div>

      {/* Basic Blocks */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="btn-builder-tool"
          id="builder-add-text"
          onClick={() => handleAddBlock('text')}
          title="Thêm khối văn bản mới"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <span>+ Chữ</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-card"
          onClick={() => handleAddBlock('card')}
          title="Thêm khung thẻ chứa nội dung"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
          </svg>
          <span>+ Khung Card</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-image"
          onClick={() => handleAddBlock('image')}
          title="Thêm khối hình ảnh"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          <span>+ Hình Ảnh</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-badge"
          onClick={() => handleAddBlock('badge')}
          title="Thêm huy hiệu trạng thái"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span>+ Huy Hiệu</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-decor"
          onClick={() => handleAddBlock('decor')}
          title="Thêm phần tử trang trí slide"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>+ Trang Trí</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-video"
          onClick={() => handleAddBlock('video')}
          title="Thêm khung video clip"
          style={btnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
          </svg>
          <span>+ Video</span>
        </button>
      </div>

      {/* Separator */}
      <span style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 6px' }} />

      {/* HyperFrames Interactive Blocks */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 mr-1 select-none flex-shrink-0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>HyperFrames:</span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="btn-builder-tool"
          id="builder-add-stat"
          onClick={() => handleAddBlock('stat')}
          title="Số liệu thống kê tự động đếm số với GSAP counter"
          style={{ ...btnStyle, borderColor: '#BAE6FD', background: '#F0F9FF', color: '#0369A1' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>+ Stat</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-callout"
          onClick={() => handleAddBlock('callout')}
          title="Hộp ghi chú nổi bật viền dạ quang phát sáng"
          style={{ ...btnStyle, borderColor: '#DDD6FE', background: '#F5F3FF', color: '#6D28D9' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>+ Callout</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-split"
          onClick={() => handleAddBlock('split')}
          title="Thẻ so sánh đối lập 2 cột cân xứng"
          style={{ ...btnStyle, borderColor: '#A7F3D0', background: '#ECFDF5', color: '#047857' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          <span>+ Split</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-steps"
          onClick={() => handleAddBlock('steps')}
          title="Tiến trình học tập theo chuỗi bước 1-2-3"
          style={{ ...btnStyle, borderColor: '#E2E8F0', background: '#F8FAFC', color: '#0F172A' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>+ Steps</span>
        </button>

        <button
          className="btn-builder-tool"
          id="builder-add-kinetic"
          onClick={() => handleAddBlock('kinetic')}
          title="Tiêu đề động nghệ thuật Kinetic Typography"
          style={{ ...btnStyle, borderColor: '#FBCFE8', background: '#FDF2F8', color: '#BE185D' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h6v7l10-11h-7V3z" />
          </svg>
          <span>+ Kinetic</span>
        </button>
      </div>

      <div style={{ flex: 1, minWidth: '12px' }} />

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          id="builder-save-layout"
          onClick={handleSaveToPack}
          title="Lưu bố cục hiện tại vào bộ mẫu để tái sử dụng"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: 'white',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Lưu Layout Vào Pack</span>
        </button>
      </div>
    </div>
  );
}
