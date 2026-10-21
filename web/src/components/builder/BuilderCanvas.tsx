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
    <div className="canvas-frame-outer" onClick={() => setActiveBuilderElementId(null)}>
      <div
        id="builder-live-canvas"
        style={{
          width: '1920px',
          height: '1080px',
          transformOrigin: 'top left',
          transform: 'scale(0.5)',
          background: '#0B1120',
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
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
              style={{
                position: 'absolute',
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
                border: isSelected ? '2px solid #38BDF8' : '1px dashed rgba(255, 255, 255, 0.25)',
                boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.4)' : 'none',
                background:
                  el.type === 'card'
                    ? 'rgba(30, 41, 59, 0.85)'
                    : el.type === 'badge'
                    ? '#0284C7'
                    : 'rgba(15, 23, 42, 0.75)',
                color: 'white',
                padding: '12px',
                borderRadius: el.type === 'badge' ? '9999px' : '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: el.type === 'badge' ? 'center' : 'flex-start',
                cursor: 'move',
                userSelect: 'none',
                boxSizing: 'border-box',
              }}
            >
              {/* Slot / Decor Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isSlot ? '#38BDF8' : '#94A3B8',
                  background: '#0F172A',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${isSlot ? '#0284C7' : '#334155'}`,
                }}
              >
                {isSlot ? '⚡ Slot' : '🎨 Decor'}: {el.id}
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden' }}>
                {el.content || `Khối ${el.type}`}
              </div>

              {/* Resize Handle */}
              {isSelected && (
                <div
                  onPointerDown={(e) =>
                    handlePointerDown(e, el.id, true, el.x, el.y, el.width, el.height)
                  }
                  style={{
                    position: 'absolute',
                    right: '-4px',
                    bottom: '-4px',
                    width: '12px',
                    height: '12px',
                    background: '#38BDF8',
                    borderRadius: '2px',
                    cursor: 'se-resize',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
