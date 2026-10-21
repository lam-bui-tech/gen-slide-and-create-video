'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import {
  updateDraftBlock,
  removeDraftBlock,
  setElementSlotRole,
  assignElementAnimation,
} from '@engine/builder.js';

export function BuilderInspector() {
  const draftLayout = useStudioStore((s) => s.draftLayout);
  const setDraftLayout = useStudioStore((s) => s.setDraftLayout);
  const activeBuilderElementId = useStudioStore((s) => s.activeBuilderElementId);
  const setActiveBuilderElementId = useStudioStore((s) => s.setActiveBuilderElementId);

  if (!draftLayout || !activeBuilderElementId) {
    return (
      <div>
        <div className="props-header" style={{ color: '#0369A1', background: '#E0F2FE' }}>
          🛠️ Builder: Thuộc Tính Khối
        </div>
        <div style={{ padding: '20px', color: 'var(--text-sub)', fontSize: '13px', textAlign: 'center' }}>
          Nhấp vào một khối trên canvas để chỉnh sửa thuộc tính.
        </div>
      </div>
    );
  }

  const el = draftLayout.elements?.find((e: any) => e.id === activeBuilderElementId);
  if (!el) return null;

  const slot = draftLayout.slots?.find((s: any) => s.targetElementId === el.id);
  const isSlot = Boolean(slot);
  const anim = draftLayout.defaultAnimations?.find((a: any) => a.target === `#${el.id}`);

  const handleCoordChange = (field: 'x' | 'y' | 'width' | 'height', val: number) => {
    const next = updateDraftBlock(draftLayout, el.id, { [field]: val });
    setDraftLayout(next);
  };

  const handleRoleChange = (role: 'slot' | 'decor') => {
    const next = setElementSlotRole(draftLayout, el.id, {
      role,
      slotName: slot?.name || el.type || 'body',
      constraints: {
        maxLength: slot?.constraints?.maxLength || 300,
        required: slot?.constraints?.required ?? true,
      },
    });
    setDraftLayout(next);
  };

  const handleSlotNameChange = (slotName: string) => {
    const next = setElementSlotRole(draftLayout, el.id, {
      role: 'slot',
      slotName,
      constraints: {
        maxLength: slot?.constraints?.maxLength || 300,
        required: slot?.constraints?.required ?? true,
      },
    });
    setDraftLayout(next);
  };

  const handleMaxLenChange = (maxLen: number) => {
    const next = setElementSlotRole(draftLayout, el.id, {
      role: 'slot',
      slotName: slot?.name || 'body',
      constraints: {
        maxLength: maxLen,
        required: slot?.constraints?.required ?? true,
      },
    });
    setDraftLayout(next);
  };

  const handleRequiredChange = (req: boolean) => {
    const next = setElementSlotRole(draftLayout, el.id, {
      role: 'slot',
      slotName: slot?.name || 'body',
      constraints: {
        maxLength: slot?.constraints?.maxLength || 300,
        required: req,
      },
    });
    setDraftLayout(next);
  };

  const handleAnimChange = (changes: { preset?: string; delay?: number; duration?: number }) => {
    const next = assignElementAnimation(draftLayout, el.id, {
      preset: changes.preset ?? anim?.preset ?? 'fade-in',
      delay: changes.delay ?? anim?.delay ?? 0.5,
      duration: changes.duration ?? anim?.duration ?? 1.0,
    });
    setDraftLayout(next);
  };

  const handleDelete = () => {
    const next = removeDraftBlock(draftLayout, el.id);
    setDraftLayout(next);
    setActiveBuilderElementId(null);
  };

  return (
    <div>
      <div className="props-header" style={{ color: '#0369A1', background: '#E0F2FE' }}>
        🛠️ Builder: Thuộc Tính Khối (<code>{el.id}</code>)
      </div>

      {/* 1. Coordinates */}
      <div className="prop-section">
        <div className="prop-section-title">Định Danh & Kích Thước (px)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label className="prop-label" htmlFor="builder-el-x">
              X (px)
            </label>
            <input
              type="number"
              id="builder-el-x"
              className="prop-input"
              step="8"
              value={el.x ?? 0}
              onChange={(e) => handleCoordChange('x', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label className="prop-label" htmlFor="builder-el-y">
              Y (px)
            </label>
            <input
              type="number"
              id="builder-el-y"
              className="prop-input"
              step="8"
              value={el.y ?? 0}
              onChange={(e) => handleCoordChange('y', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label className="prop-label" htmlFor="builder-el-w">
              Rộng (px)
            </label>
            <input
              type="number"
              id="builder-el-w"
              className="prop-input"
              step="8"
              value={el.width ?? 100}
              onChange={(e) => handleCoordChange('width', parseInt(e.target.value, 10) || 80)}
            />
          </div>
          <div>
            <label className="prop-label" htmlFor="builder-el-h">
              Cao (px)
            </label>
            <input
              type="number"
              id="builder-el-h"
              className="prop-input"
              step="8"
              value={el.height ?? 80}
              onChange={(e) => handleCoordChange('height', parseInt(e.target.value, 10) || 40)}
            />
          </div>
        </div>
      </div>

      {/* 2. Slot vs Decor Role */}
      <div className="prop-section">
        <div className="prop-section-title">Vai Trò Dữ Liệu (Slot vs Decor)</div>
        <div className="prop-group">
          <label className="prop-label" htmlFor="builder-slot-role-type">
            Loại vai trò
          </label>
          <select
            id="builder-slot-role-type"
            className="prop-select"
            value={isSlot ? 'slot' : 'decor'}
            onChange={(e) => handleRoleChange(e.target.value as 'slot' | 'decor')}
          >
            <option value="slot">Slot Động (Nhận nội dung sinh từ AI)</option>
            <option value="decor">Decor Tĩnh (Không nhận dữ liệu AI)</option>
          </select>
        </div>

        {isSlot && (
          <>
            <div className="prop-group" id="builder-slot-name-group">
              <label className="prop-label" htmlFor="builder-slot-name-select">
                Tên Slot (Slot Role)
              </label>
              <select
                id="builder-slot-name-select"
                className="prop-select"
                value={slot?.name || 'body'}
                onChange={(e) => handleSlotNameChange(e.target.value)}
              >
                <option value="title">title (Tiêu đề chính)</option>
                <option value="body">body (Đoạn giải thích/nội dung)</option>
                <option value="card">card (Khối nội dung)</option>
                <option value="media">media (Ảnh / Sơ đồ)</option>
                <option value="badge">badge (Huy hiệu)</option>
                <option value="author">author (Tác giả/giảng viên)</option>
                <option value="sideText">sideText (Chú thích bên lề)</option>
                <option value="formula">formula (Công thức/Định lý)</option>
              </select>
            </div>
            <div className="prop-group" id="builder-constraints-group">
              <label className="prop-label" htmlFor="builder-constraint-max-len">
                Giới hạn ký tự tối đa (maxLength)
              </label>
              <input
                type="number"
                id="builder-constraint-max-len"
                className="prop-input"
                step="50"
                value={slot?.constraints?.maxLength || 300}
                onChange={(e) => handleMaxLenChange(parseInt(e.target.value, 10) || 300)}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  marginTop: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  id="builder-constraint-required"
                  checked={slot?.constraints?.required !== false}
                  onChange={(e) => handleRequiredChange(e.target.checked)}
                />{' '}
                Bắt buộc có nội dung (required)
              </label>
            </div>
          </>
        )}
      </div>

      {/* 3. GSAP Animation */}
      <div className="prop-section">
        <div className="prop-section-title">Hiệu Ứng Hoạt Họa GSAP</div>
        <div className="prop-group">
          <label className="prop-label" htmlFor="builder-anim-preset">
            Preset Hoạt Họa
          </label>
          <select
            id="builder-anim-preset"
            className="prop-select"
            value={anim?.preset || 'fade-in'}
            onChange={(e) => handleAnimChange({ preset: e.target.value })}
          >
            <option value="fade-in">Fade In (Hiện dần)</option>
            <option value="slide-in">Slide In (Trượt vào)</option>
            <option value="zoom-in">Zoom In (Phóng to nhẹ)</option>
            <option value="typewriter">Typewriter (Đánh máy)</option>
            <option value="step-by-step">Step-by-Step (Từng bước)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label className="prop-label" htmlFor="builder-anim-delay">
              Độ trễ (s)
            </label>
            <input
              type="number"
              id="builder-anim-delay"
              className="prop-input"
              step="0.1"
              value={anim?.delay ?? 0.5}
              onChange={(e) => handleAnimChange({ delay: parseFloat(e.target.value) || 0.5 })}
            />
          </div>
          <div>
            <label className="prop-label" htmlFor="builder-anim-dur">
              Thời lượng (s)
            </label>
            <input
              type="number"
              id="builder-anim-dur"
              className="prop-input"
              step="0.1"
              value={anim?.duration ?? 1.0}
              onChange={(e) => handleAnimChange({ duration: parseFloat(e.target.value) || 1.0 })}
            />
          </div>
        </div>
      </div>

      {/* 4. Delete */}
      <div className="prop-section">
        <button
          className="btn btn-secondary"
          id="btn-builder-delete-element"
          onClick={handleDelete}
          style={{
            color: '#E11D48',
            width: '100%',
            borderColor: '#FECDD3',
            background: '#FFF1F2',
            fontWeight: 600,
          }}
        >
          ✕ Xóa Khối Này Khỏi Layout
        </button>
      </div>
    </div>
  );
}
