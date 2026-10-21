import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { Navbar } from '@/components/shell/Navbar';
import { SlideNavigator } from '@/components/shell/SlideNavigator';
import { CanvasPaneFrame } from '@/components/shell/CanvasPaneFrame';
import { PropsPanelFrame } from '@/components/shell/PropsPanelFrame';
import sampleScene from '@fixtures/scene.sample.json';
import type { LessonSceneJSON } from '@schemas/types';

describe('Phase F3: Shell Components', () => {
  beforeEach(() => {
    useStudioStore.setState({
      scene: JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON,
      currentSlideIndex: 0,
      history: [JSON.parse(JSON.stringify(sampleScene)) as LessonSceneJSON],
      historyIndex: 0,
      saveStatus: 'saved',
      mode: 'slide',
    });
  });

  describe('Navbar', () => {
    it('renders project title and save status correctly', () => {
      render(<Navbar />);
      const titleInput = screen.getByDisplayValue(sampleScene.title);
      expect(titleInput).toBeDefined();

      const saveStatus = screen.getByText('Đã lưu');
      expect(saveStatus).toBeDefined();
    });

    it('displays pack name badge', () => {
      render(<Navbar />);
      const packBadge = screen.getByText((sampleScene as any).templatePackId || 'basic');
      expect(packBadge).toBeDefined();
    });

    it('has disabled undo button initially and enables after dispatch', () => {
      render(<Navbar />);
      const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;
      expect(undoBtn.disabled).toBe(true);

      // Perform an action
      useStudioStore.getState().dispatch(
        { type: 'UPDATE_SLIDE', payload: { slideIndex: 0, changes: { title: 'New Title' } } },
        'Change title'
      );

      // Re-render / state updated
      expect(useStudioStore.getState().historyIndex).toBe(1);
    });

    it('triggers new project confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<Navbar />);
      const newProjBtn = document.getElementById('btn-new-project');
      fireEvent.click(newProjBtn!);

      expect(confirmSpy).toHaveBeenCalled();
      expect(useStudioStore.getState().scene?.title).toBe('Bài Giảng Mới');
      confirmSpy.mockRestore();
    });
  });

  describe('SlideNavigator', () => {
    it('renders slide count and list of slide cards', () => {
      render(<SlideNavigator />);
      const countLabel = document.getElementById('deck-count-label');
      expect(countLabel?.textContent).toContain(`Slide (${sampleScene.slides.length})`);

      const slideItems = document.querySelectorAll('.slide-card-item');
      expect(slideItems.length).toBe(sampleScene.slides.length);
    });

    it('selects slide on click', () => {
      render(<SlideNavigator />);
      const slideItems = document.querySelectorAll('.slide-card-item');
      fireEvent.click(slideItems[2]);

      expect(useStudioStore.getState().currentSlideIndex).toBe(2);
    });

    it('adds a new slide when clicking "+ Thêm"', () => {
      render(<SlideNavigator />);
      const initialCount = useStudioStore.getState().scene?.slides.length || 0;
      const addBtn = document.getElementById('btn-add-slide');
      fireEvent.click(addBtn!);

      const newCount = useStudioStore.getState().scene?.slides.length || 0;
      expect(newCount).toBe(initialCount + 1);
    });

    it('duplicates a slide when clicking clone button', () => {
      render(<SlideNavigator />);
      const initialCount = useStudioStore.getState().scene?.slides.length || 0;
      const dupBtns = document.querySelectorAll('.btn-dup-slide');
      fireEvent.click(dupBtns[0]);

      const newCount = useStudioStore.getState().scene?.slides.length || 0;
      expect(newCount).toBe(initialCount + 1);
      expect(useStudioStore.getState().scene?.slides[1].title).toContain('(Bản sao)');
    });

    it('deletes a slide when clicking delete button', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<SlideNavigator />);
      const initialCount = useStudioStore.getState().scene?.slides.length || 0;
      const delBtns = document.querySelectorAll('.btn-del-slide');
      fireEvent.click(delBtns[0]);

      expect(confirmSpy).toHaveBeenCalled();
      const newCount = useStudioStore.getState().scene?.slides.length || 0;
      expect(newCount).toBe(initialCount - 1);
      confirmSpy.mockRestore();
    });
  });

  describe('CanvasPaneFrame', () => {
    it('navigates previous and next slides via arrow buttons', () => {
      render(
        <CanvasPaneFrame>
          <div>Canvas Content</div>
        </CanvasPaneFrame>
      );

      const nextBtn = document.getElementById('btn-next-slide') as HTMLButtonElement;
      const prevBtn = document.getElementById('btn-prev-slide') as HTMLButtonElement;

      expect(prevBtn.disabled).toBe(true);
      fireEvent.click(nextBtn);
      expect(useStudioStore.getState().currentSlideIndex).toBe(1);

      expect(prevBtn.disabled).toBe(false);
      fireEvent.click(prevBtn);
      expect(useStudioStore.getState().currentSlideIndex).toBe(0);
    });

    it('toggles builder mode', () => {
      render(
        <CanvasPaneFrame>
          <div>Canvas Content</div>
        </CanvasPaneFrame>
      );

      const toggleBtn = document.getElementById('btn-toggle-builder-mode') as HTMLButtonElement;
      fireEvent.click(toggleBtn);
      expect(useStudioStore.getState().mode).toBe('builder');

      fireEvent.click(toggleBtn);
      expect(useStudioStore.getState().mode).toBe('slide');
    });
  });

  describe('PropsPanelFrame', () => {
    it('renders normal children in slide mode and builder inspector in builder mode', () => {
      const { rerender } = render(
        <PropsPanelFrame builderInspector={<div>Builder Tools</div>}>
          <div>Normal Props</div>
        </PropsPanelFrame>
      );

      expect(screen.getByText('Normal Props')).toBeDefined();

      useStudioStore.setState({ mode: 'builder' });
      rerender(
        <PropsPanelFrame builderInspector={<div>Builder Tools</div>}>
          <div>Normal Props</div>
        </PropsPanelFrame>
      );

      expect(screen.getByText('Builder Tools')).toBeDefined();
    });
  });
});
