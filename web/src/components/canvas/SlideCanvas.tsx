'use client';

import React, { useLayoutEffect, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { renderSlide } from '@templates/index.js';
import {
  EDITABLE_SELECTORS_STRING,
  getEditableDefinition,
  computeSlideHash,
} from '@/lib/editableSelectors';

export const SlideCanvas = forwardRef<HTMLDivElement>(function SlideCanvas(_props, ref) {
  const internalRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const dispatch = useStudioStore((s) => s.dispatch);
  const openImageModal = useStudioStore((s) => s.openImageModal);

  const slide = scene?.slides?.[currentSlideIndex];
  const slideHash = computeSlideHash(slide);
  const lastRenderedHashRef = useRef<string>('');

  // Use layout effect on client to update innerHTML only when slide hash changes
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (!internalRef.current || !slide) return;

    // Only update innerHTML if slide content actually changed from an outside action
    // to preserve caret and focus while typing
    if (lastRenderedHashRef.current !== slideHash) {
      lastRenderedHashRef.current = slideHash;
      const html = renderSlide(slide, 0, slide.durationSeconds || 16.0);
      internalRef.current.innerHTML = html;

      // Mark editable text elements
      const editableNodes = internalRef.current.querySelectorAll(EDITABLE_SELECTORS_STRING);
      editableNodes.forEach((node) => {
        node.setAttribute('contenteditable', 'true');
        node.setAttribute('spellcheck', 'false');
      });

      // Mark editable images
      const images = internalRef.current.querySelectorAll('img');
      images.forEach((img) => {
        img.classList.add('editable-image');
        img.title = 'Click để thay đổi ảnh minh họa';
      });
    }
  }, [slideHash, slide]);

  // Event delegation on canvas root: blur handles text commits
  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target || !slide) return;

    const def = getEditableDefinition(target);
    if (!def) return;

    const newText = (target.innerText || '').trim();

    if (def.selector === '.slide-title') {
      if (slide.title !== newText) {
        dispatch(
          {
            type: 'UPDATE_SLIDE',
            payload: { slideIndex: currentSlideIndex, changes: { title: newText } },
          },
          'Sửa tiêu đề slide'
        );
      }
    } else if (def.selector === '.title-hero-sub') {
      if (slide.subtitle !== newText) {
        dispatch(
          {
            type: 'UPDATE_SLIDE',
            payload: { slideIndex: currentSlideIndex, changes: { subtitle: newText } },
          },
          'Sửa phụ đề slide'
        );
      }
    } else if (def.selector === '.concept-quote') {
      const defEl = slide.elements?.find((x: any) => x.type === 'card' || x.type === 'text');
      if (defEl) {
        const cleaned = newText.replace(/^[“”"]|[“”"]$/g, '');
        if (defEl.content !== cleaned) {
          dispatch(
            {
              type: 'UPDATE_ELEMENT',
              payload: {
                slideIndex: currentSlideIndex,
                elementId: defEl.id,
                changes: { content: cleaned },
              },
            },
            'Sửa định nghĩa'
          );
        }
      }
    } else {
      // Find element by target.id or matching class
      if (target.id && slide.elements?.some((x: any) => x.id === target.id)) {
        dispatch(
          {
            type: 'UPDATE_ELEMENT',
            payload: {
              slideIndex: currentSlideIndex,
              elementId: target.id,
              changes: { content: newText },
            },
          },
          'Sửa nội dung khối'
        );
      }
    }
  };

  // Event delegation on canvas root: click handles image inspection
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      openImageModal(target.id || (target as HTMLImageElement).src);
    }
  };

  return (
    <div className="canvas-frame-outer">
      <div
        id="live-canvas"
        ref={internalRef}
        onBlurCapture={handleBlurCapture}
        onClick={handleClick}
      />
    </div>
  );
});
