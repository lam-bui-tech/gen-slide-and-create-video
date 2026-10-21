'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { addDraftBlock, validateDraftLayout, exportLayoutForSave } from '@engine/builder.js';
import { api } from '@/lib/api';

export function BuilderToolbar() {
  const draftLayout = useStudioStore((s) => s.draftLayout);
  const setDraftLayout = useStudioStore((s) => s.setDraftLayout);
  const setActiveBuilderElementId = useStudioStore((s) => s.setActiveBuilderElementId);
  const toggleBuilderMode = useStudioStore((s) => s.toggleBuilderMode);
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
    const validation = validateDraftLayout(draftLayout);
    if (!validation.valid) {
      alert(`Không thể lưu layout:\n${validation.errors.join('\n')}`);
      return;
    }

    const packId = (scene as any)?.templatePackId || scene?.packId || 'basic';
    try {
      const exported = exportLayoutForSave(draftLayout);
      await api.saveLayoutToPack(packId, exported);
      alert(`✅ Đã lưu layout "${draftLayout.name}" vào bộ mẫu [${packId}] thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi lưu layout vào bộ mẫu: ${msg}`);
    }
  };

  return (
    <div
      id="builder-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#0F172A',
        color: 'white',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '12px', color: '#38BDF8', marginRight: '6px' }}>
        🛠️ Thêm Khối:
      </span>
      <button
        className="btn btn-secondary"
        id="builder-add-text"
        onClick={() => handleAddBlock('text')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Chữ
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-card"
        onClick={() => handleAddBlock('card')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Khung Card
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-image"
        onClick={() => handleAddBlock('image')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Hình Ảnh
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-badge"
        onClick={() => handleAddBlock('badge')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Huy Hiệu
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-decor"
        onClick={() => handleAddBlock('decor')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Trang Trí
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-video"
        onClick={() => handleAddBlock('video')}
        style={{ padding: '4px 8px', fontSize: '11px', color: 'white', background: '#1E293B', borderColor: '#475569' }}
      >
        + Video
      </button>

      <span style={{ width: '1px', height: '18px', background: '#475569', margin: '0 4px' }} />
      <span style={{ fontWeight: 700, fontSize: '11px', color: '#F59E0B' }}>
        ⚡ HyperFrames:
      </span>
      <button
        className="btn btn-secondary"
        id="builder-add-stat"
        onClick={() => handleAddBlock('stat')}
        title="Số liệu thống kê tự động đếm số với GSAP counter"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#FDE68A', background: '#78350F', borderColor: '#B45309' }}
      >
        + 📈 Stat
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-callout"
        onClick={() => handleAddBlock('callout')}
        title="Hộp ghi chú nổi bật viền dạ quang phát sáng"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#DDD6FE', background: '#4C1D95', borderColor: '#6D28D9' }}
      >
        + 💡 Callout
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-split"
        onClick={() => handleAddBlock('split')}
        title="Thẻ so sánh đối lập 2 cột cân xứng"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#A7F3D0', background: '#064E3B', borderColor: '#047857' }}
      >
        + ⚖️ Split
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-steps"
        onClick={() => handleAddBlock('steps')}
        title="Tiến trình học tập theo chuỗi bước 1-2-3"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#BAE6FD', background: '#0C4A6E', borderColor: '#0369A1' }}
      >
        + 🚀 Steps
      </button>
      <button
        className="btn btn-secondary"
        id="builder-add-kinetic"
        onClick={() => handleAddBlock('kinetic')}
        title="Tiêu đề động nghệ thuật Kinetic Typography"
        style={{ padding: '4px 8px', fontSize: '11px', color: '#FBCFE8', background: '#831843', borderColor: '#BE185D' }}
      >
        + ✨ Kinetic
      </button>

      <div style={{ flex: 1 }} />

      <button
        className="btn btn-primary"
        id="builder-save-layout"
        onClick={handleSaveToPack}
        style={{ background: '#059669', color: 'white', padding: '5px 14px', fontSize: '12px', fontWeight: 700 }}
      >
        💾 Lưu Layout Vào Pack
      </button>
      <button
        className="btn btn-secondary"
        id="builder-exit-btn"
        onClick={() => toggleBuilderMode(false)}
        style={{ padding: '4px 8px', fontSize: '11px', color: '#CBD5E1', background: '#334155' }}
      >
        ✕ Thoát Builder
      </button>
    </div>
  );
}
