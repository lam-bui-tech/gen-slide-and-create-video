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
      width: type === 'card' ? 560 : type === 'image' ? 480 : type === 'video' ? 520 : 400,
      height: type === 'card' ? 320 : type === 'image' ? 360 : type === 'video' ? 300 : 80,
      content:
        type === 'text'
          ? 'Nhập nội dung văn bản mới...'
          : type === 'badge'
          ? 'HUY HIỆU'
          : type === 'image'
          ? 'https://placehold.co/600x400/e2e8f0/475569?text=Image'
          : type === 'video'
          ? 'storage/projects/sample/video/sample_clip.mp4'
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
