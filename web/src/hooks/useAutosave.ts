'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function useAutosave(debounceMs = 500) {
  const scene = useStudioStore((s) => s.scene);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const setSaveStatus = useStudioStore((s) => s.setSaveStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!scene || !scene.projectId) return;
    if (saveStatus !== 'saving') return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.saveScene(scene.projectId, scene);
        setSaveStatus('saved', res.savedAt || new Date().toISOString());
      } catch (err: unknown) {
        console.error('[Autosave] Failed to save scene:', err);
        setSaveStatus('error');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [scene, saveStatus, debounceMs, setSaveStatus]);

  const triggerImmediateSave = async () => {
    if (!scene || !scene.projectId) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setSaveStatus('saving');
    try {
      const res = await api.saveScene(scene.projectId, scene);
      setSaveStatus('saved', res.savedAt || new Date().toISOString());
    } catch (err: unknown) {
      console.error('[Autosave] Immediate save failed:', err);
      setSaveStatus('error');
    }
  };

  return {
    saveStatus,
    triggerImmediateSave,
  };
}
