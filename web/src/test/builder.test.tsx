import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStudioStore } from '@/store/useStudioStore';
import { BuilderToolbar } from '@/components/builder/BuilderToolbar';
import { BuilderCanvas } from '@/components/builder/BuilderCanvas';
import { BuilderInspector } from '@/components/builder/BuilderInspector';
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { snapToGrid } from '@engine/builder.js';

describe('Phase F7: Template Layout Builder Mode', () => {
  beforeEach(() => {
    useStudioStore.setState({
      mode: 'builder',
      activeBuilderElementId: null,
      draftLayout: {
        id: 'draft-test-layout',
        name: 'Draft Layout Test',
        elements: [
          { id: 'heading-1', type: 'text', x: 80, y: 80, width: 600, height: 100, content: 'Tiêu đề kiểm thử' },
          { id: 'body-card-1', type: 'card', x: 80, y: 220, width: 800, height: 400, content: 'Thẻ nội dung' }
        ],
        slots: [
          { targetElementId: 'heading-1', name: 'title', constraints: { maxLength: 100, required: true } }
        ],
        defaultAnimations: [
          { target: '#heading-1', preset: 'fade-in', delay: 0.2, duration: 0.8 }
        ]
      }
    });
  });

  it('snapToGrid utility aligns coordinates to grid granularity', () => {
    expect(snapToGrid(83, 8)).toBe(80);
    expect(snapToGrid(86, 8)).toBe(88);
    expect(snapToGrid(15, 10)).toBe(20);
    expect(snapToGrid(0, 8)).toBe(0);
  });

  it('BuilderCanvas renders all draft layout blocks', () => {
    render(<BuilderCanvas />);
    expect(screen.getByText('Tiêu đề kiểm thử')).toBeInTheDocument();
    expect(screen.getByText('Thẻ nội dung')).toBeInTheDocument();
    expect(screen.getByText('⚡ Slot: heading-1')).toBeInTheDocument();
    expect(screen.getByText('🎨 Decor: body-card-1')).toBeInTheDocument();
  });

  it('clicking a block selects it as active builder element and persists selection on click', () => {
    render(<BuilderCanvas />);
    const cardEl = screen.getByText('Thẻ nội dung');
    fireEvent.pointerDown(cardEl);
    fireEvent.click(cardEl);

    expect(useStudioStore.getState().activeBuilderElementId).toBe('body-card-1');

    // Clicking outside on the canvas frame container resets selection
    const outerCanvas = document.querySelector('.canvas-frame-outer')!;
    fireEvent.click(outerCanvas);
    expect(useStudioStore.getState().activeBuilderElementId).toBeNull();
  });

  it('BuilderToolbar adds new blocks into draftLayout', () => {
    render(<BuilderToolbar />);
    const addBadgeBtn = screen.getByText('+ Huy Hiệu');
    fireEvent.click(addBadgeBtn);

    const draft = useStudioStore.getState().draftLayout;
    expect(draft?.elements.length).toBe(3);
    const badgeEl = draft?.elements.find((e: any) => e.type === 'badge');
    expect(badgeEl).toBeDefined();
    expect(badgeEl?.content).toBe('HUY HIỆU');
    expect(useStudioStore.getState().activeBuilderElementId).toBe(badgeEl?.id);
  });

  it('BuilderInspector displays and updates coordinates and slot roles', () => {
    useStudioStore.setState({ activeBuilderElementId: 'heading-1' });
    render(<BuilderInspector />);

    const xInput = screen.getByLabelText(/X \(px\)/i) as HTMLInputElement;
    expect(xInput.value).toBe('80');

    fireEvent.change(xInput, { target: { value: '120' } });
    const updatedDraft = useStudioStore.getState().draftLayout;
    expect(updatedDraft?.elements.find((e: any) => e.id === 'heading-1')?.x).toBe(120);

    // Switch slot role to decor
    const roleSelect = screen.getByLabelText(/Loại vai trò/i) as HTMLSelectElement;
    expect(roleSelect.value).toBe('slot');
    fireEvent.change(roleSelect, { target: { value: 'decor' } });

    const draftAfterRoleChange = useStudioStore.getState().draftLayout;
    const slotEntry = draftAfterRoleChange?.slots?.find((s: any) => s.targetElementId === 'heading-1');
    expect(slotEntry).toBeUndefined();
  });

  it('BuilderInspector deletes selected block', () => {
    useStudioStore.setState({ activeBuilderElementId: 'heading-1' });
    render(<BuilderInspector />);

    const deleteBtn = screen.getByRole('button', { name: /Xóa Khối Này Khỏi Layout/i });
    fireEvent.click(deleteBtn);

    const draftAfterDelete = useStudioStore.getState().draftLayout;
    expect(draftAfterDelete?.elements.find((e: any) => e.id === 'heading-1')).toBeUndefined();
    expect(useStudioStore.getState().activeBuilderElementId).toBeNull();
  });

  it('CanvasArea switches between builder and normal canvas depending on mode', () => {
    useStudioStore.setState({ mode: 'builder' });
    const { unmount } = render(<CanvasArea />);

    expect(screen.getByText(/Thêm Khối:/i)).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-bar')).not.toBeInTheDocument();
    unmount();

    useStudioStore.setState({ mode: 'slide' });
    render(<CanvasArea />);
    expect(screen.queryByText(/Thêm Khối:/i)).not.toBeInTheDocument();
  });


});
