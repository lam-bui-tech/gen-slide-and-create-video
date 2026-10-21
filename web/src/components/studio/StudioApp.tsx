'use client';

import React, { useEffect } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';
import { useAutosave } from '@/hooks/useAutosave';
import { useExportPolling } from '@/hooks/useExportPolling';
import { Navbar } from '@/components/shell/Navbar';
import { SlideNavigator } from '@/components/shell/SlideNavigator';
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { PropsPanelFrame } from '@/components/shell/PropsPanelFrame';
import { PropsPanel } from '@/components/props/PropsPanel';
import { BuilderInspector } from '@/components/builder/BuilderInspector';
import { ModalHost } from '@/components/modals/ModalHost';
import { PresentationMode } from '@/components/presentation/PresentationMode';
import { ErrorBoundary } from '@/components/debug/ErrorBoundary';
import { DebugDrawer } from '@/components/debug/DebugDrawer';
import type { LessonSceneJSON } from '@schemas/types';

interface StudioAppProps {
  projectId?: string;
  initialScene?: LessonSceneJSON;
  initialPackId?: string;
}

export function StudioApp({ projectId, initialScene, initialPackId }: StudioAppProps) {
  const scene = useStudioStore((s) => s.scene);
  const setScene = useStudioStore((s) => s.setScene);
  const createNewEmptyProject = useStudioStore((s) => s.createNewEmptyProject);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const setSlideIndex = useStudioStore((s) => s.setSlideIndex);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const dispatch = useStudioStore((s) => s.dispatch);
  const setAvailablePacks = useStudioStore((s) => s.setAvailablePacks);

  // Initialize autosave & export polling
  useAutosave(500);
  useExportPolling(1000);

  const hasInitializedRef = React.useRef(false);
  const appliedPackRef = React.useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    if (initialScene) {
      setScene(initialScene);
    } else if (!hasInitializedRef.current && !useStudioStore.getState().scene) {
      hasInitializedRef.current = true;
      if (projectId) {
        api.getScene(projectId)
          .then((loadedScene) => {
            setScene(loadedScene);
          })
          .catch((err) => {
            console.warn('[StudioApp] Failed to load project, creating clean empty project:', err);
            appliedPackRef.current = initialPackId || 'basic';
            createNewEmptyProject(initialPackId);
          });
      } else {
        appliedPackRef.current = initialPackId || 'basic';
        createNewEmptyProject(initialPackId);
      }
    }

    // Load available template packs
    api.getPacks()
      .then((packs) => {
        if (packs && packs.length > 0) {
          setAvailablePacks(packs);
        }
      })
      .catch((err) => {
        console.warn('[StudioApp] Could not fetch packs:', err);
      });
  }, [projectId, initialScene, initialPackId, setScene, setAvailablePacks, createNewEmptyProject]);

  // Auto-apply initialPackId if provided from gallery redirect
  useEffect(() => {
    if (!initialPackId || !scene) return;
    const currentPack = scene.packId || (scene as any).templatePackId || (scene as any).templatePack;
    if (currentPack !== initialPackId && appliedPackRef.current !== initialPackId) {
      appliedPackRef.current = initialPackId;
      dispatch(
        { type: 'SWITCH_TEMPLATE_PACK', payload: { packId: initialPackId } },
        `Chuyển template pack sang ${initialPackId}`
      );
    }
  }, [initialPackId, scene, dispatch]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!isInput && e.key === 'ArrowLeft' && e.altKey) {
        if (currentSlideIndex > 0) setSlideIndex(currentSlideIndex - 1);
      } else if (!isInput && e.key === 'ArrowRight' && e.altKey) {
        const total = scene?.slides?.length || 0;
        if (currentSlideIndex < total - 1) setSlideIndex(currentSlideIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, currentSlideIndex, scene?.slides?.length, setSlideIndex]);

  return (
    <div className="studio-app-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ErrorBoundary paneName="Navbar">
        <Navbar />
      </ErrorBoundary>
      <div className="studio-workspace">
        <ErrorBoundary paneName="SlideNavigator">
          <SlideNavigator />
        </ErrorBoundary>
        <ErrorBoundary paneName="CanvasArea">
          <CanvasArea />
        </ErrorBoundary>
        <ErrorBoundary paneName="PropsPanel">
          <PropsPanelFrame builderInspector={<BuilderInspector />}>
            <PropsPanel />
          </PropsPanelFrame>
        </ErrorBoundary>
      </div>
      <ErrorBoundary paneName="ModalHost">
        <ModalHost />
      </ErrorBoundary>
      <ErrorBoundary paneName="PresentationMode">
        <PresentationMode />
      </ErrorBoundary>
      <DebugDrawer />
    </div>
  );
}
