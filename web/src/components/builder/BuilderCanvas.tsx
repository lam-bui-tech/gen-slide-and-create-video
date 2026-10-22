'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { updateDraftBlock, snapToGrid } from '@engine/builder.js';

export function BuilderCanvas() {
  const draftLayout = useStudioStore((s) => s.draftLayout);
  const setDraftLayout = useStudioStore((s) => s.setDraftLayout);
  const activeBuilderElementId = useStudioStore((s) => s.activeBuilderElementId);
  const setActiveBuilderElementId = useStudioStore((s) => s.setActiveBuilderElementId);

  const dragRef = useRef<{
    elId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isResizing?: boolean;
    initialW?: number;
    initialH?: number;
  } | null>(null);

  const elements = draftLayout?.elements || [];

  const handlePointerDown = (
    e: React.PointerEvent,
    elId: string,
    isResize = false,
    initialX = 0,
    initialY = 0,
    initialW = 0,
    initialH = 0
  ) => {
    e.stopPropagation();
    setActiveBuilderElementId(elId);

    dragRef.current = {
      elId,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      isResizing: isResize,
      initialW,
      initialH,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragRef.current || !draftLayout) return;
      const { elId, startX, startY, initialX, initialY, isResizing, initialW = 0, initialH = 0 } =
        dragRef.current;

      // Scale factor is 0.5 (960px container / 1920px native)
      const dx = (moveEvt.clientX - startX) / 0.5;
      const dy = (moveEvt.clientY - startY) / 0.5;

      if (isResizing) {
        const newW = Math.max(80, snapToGrid(initialW + dx, 8));
        const newH = Math.max(40, snapToGrid(initialH + dy, 8));
        const next = updateDraftBlock(draftLayout, elId, { width: newW, height: newH });
        setDraftLayout(next);
      } else {
        const newX = Math.max(0, snapToGrid(initialX + dx, 8));
        const newY = Math.max(0, snapToGrid(initialY + dy, 8));
        const next = updateDraftBlock(draftLayout, elId, { x: newX, y: newY });
        setDraftLayout(next);
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className="canvas-frame-outer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveBuilderElementId(null);
        }
      }}
      style={{
        background: '#F1F5F9',
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
        minHeight: '100%',
        position: 'relative',
      }}
    >
      {/* 16:9 Slide Canvas Wrapper */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setActiveBuilderElementId(null);
          }
        }}
        style={{
          width: '960px',
          height: '540px',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          borderRadius: '12px',
          border: '1px solid #CBD5E1',
          overflow: 'hidden',
          background: '#FFFFFF',
        }}
      >
        <div
          id="builder-live-canvas"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveBuilderElementId(null);
            }
          }}
          style={{
            width: '1920px',
            height: '1080px',
            transformOrigin: 'top left',
            transform: 'scale(0.5)',
            background: '#FFFFFF',
            backgroundImage:
              'linear-gradient(to right, rgba(2, 132, 199, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(2, 132, 199, 0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Subtle Canvas Corner Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '24px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#94A3B8',
              letterSpacing: '0.04em',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            HYPERFRAMES CANVAS • 1920 × 1080 (16:9)
          </div>

          {elements.map((el: any) => {
            const isSelected = el.id === activeBuilderElementId;
            const isSlot = draftLayout?.slots?.some((s: any) => s.targetElementId === el.id);

            return (
              <div
                key={el.id}
                className="builder-block"
                onPointerDown={(e) =>
                  handlePointerDown(e, el.id, false, el.x, el.y, el.width, el.height)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBuilderElementId(el.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  border: isSelected
                    ? '2.5px solid #0284C7'
                    : isSlot
                    ? '1.5px dashed #93C5FD'
                    : '1px solid #E2E8F0',
                  boxShadow: isSelected
                    ? '0 0 0 4px rgba(2, 132, 199, 0.15), 0 10px 15px -3px rgba(15, 23, 42, 0.08)'
                    : '0 2px 4px rgba(0, 0, 0, 0.03)',
                  background:
                    el.type === 'card'
                      ? '#FFFFFF'
                      : el.type === 'badge'
                      ? '#E0F2FE'
                      : el.type === 'stat'
                      ? '#FFFFFF'
                      : el.type === 'callout'
                      ? '#F0F9FF'
                      : el.type === 'split'
                      ? '#F8FAFC'
                      : el.type === 'steps'
                      ? '#FFFFFF'
                      : el.type === 'kinetic'
                      ? 'linear-gradient(135deg, #FDF4FF 0%, #FAE8FF 100%)'
                      : el.type === 'image'
                      ? '#F1F5F9'
                      : el.type === 'video'
                      ? '#0F172A'
                      : '#FFFFFF',
                  color:
                    el.type === 'badge'
                      ? '#0369A1'
                      : el.type === 'video'
                      ? '#F8FAFC'
                      : el.type === 'callout'
                      ? '#0C4A6E'
                      : '#1E293B',
                  padding: el.type === 'badge' ? '4px 16px' : '16px',
                  borderRadius: el.type === 'badge' ? '9999px' : '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: el.type === 'badge' ? 'center' : 'flex-start',
                  cursor: 'move',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Callout Left Accent Bar */}
                {el.type === 'callout' && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      background: '#0284C7',
                      borderTopLeftRadius: '11px',
                      borderBottomLeftRadius: '11px',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Slot / Decor Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isSlot ? '#0369A1' : '#475569',
                    background: isSlot ? '#F0F9FF' : '#F8FAFC',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${isSlot ? '#BAE6FD' : '#CBD5E1'}`,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    zIndex: 10,
                  }}
                >
                  {isSlot ? '⚡ Slot' : '🎨 Decor'}: {el.id}
                </div>

                {/* Block Content Rendering */}
                <div style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {el.type === 'stat' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <span style={{ fontSize: '38px', fontWeight: 800, color: '#0369A1', lineHeight: 1.1 }}>
                        {el.content?.split(' ')?.[0] || '99.5%'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                        {el.content?.split(' ')?.slice(1)?.join(' ') || 'Độ Chính Xác Nhận Dạng'}
                      </span>
                    </div>
                  ) : el.type === 'kinetic' ? (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#86198F' }}>
                        {el.content}
                      </span>
                    </div>
                  ) : el.type === 'split' ? (
                    <div style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'stretch' }}>
                      <div style={{ flex: 1, padding: '12px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '14px', color: '#334155', fontWeight: 600 }}>
                        {el.content?.split('⟷')?.[0] || 'Cột A'}
                      </div>
                      <div style={{ width: '1px', background: '#E2E8F0' }} />
                      <div style={{ flex: 1, padding: '12px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '14px', color: '#0284C7', fontWeight: 600 }}>
                        {el.content?.split('⟷')?.[1] || 'Cột B'}
                      </div>
                    </div>
                  ) : el.type === 'steps' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '9999px', background: '#0284C7', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>1</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Khởi tạo</span>
                      </div>
                      <span style={{ color: '#94A3B8', fontSize: '16px' }}>➔</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '9999px', background: '#0284C7', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>2</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Huấn luyện</span>
                      </div>
                      <span style={{ color: '#94A3B8', fontSize: '16px' }}>➔</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '9999px', background: '#0284C7', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>3</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Đánh giá</span>
                      </div>
                    </div>
                  ) : el.type === 'image' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', gap: '8px' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{el.content || 'Khung hình ảnh'}</span>
                    </div>
                  ) : el.type === 'video' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '8px' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{el.content || 'Khung Video Clip'}</span>
                    </div>
                  ) : (
                    el.content || `Khối ${el.type}`
                  )}
                </div>

                {/* Resize Handle */}
                {isSelected && (
                  <div
                    onPointerDown={(e) =>
                      handlePointerDown(e, el.id, true, el.x, el.y, el.width, el.height)
                    }
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: '-5px',
                      bottom: '-5px',
                      width: '12px',
                      height: '12px',
                      background: '#0284C7',
                      border: '2px solid #FFFFFF',
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                      cursor: 'se-resize',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
