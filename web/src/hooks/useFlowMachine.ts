'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createFlowMachine } from '@engine/flow.js';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function useFlowMachine() {
  const selectedGalleryPackId = useStudioStore((s) => s.selectedGalleryPackId);
  const setUploadProgress = useStudioStore((s) => s.setUploadProgress);
  const openClarificationModal = useStudioStore((s) => s.openClarificationModal);

  const machineRef = useRef<ReturnType<typeof createFlowMachine> | null>(null);
  if (!machineRef.current) {
    machineRef.current = createFlowMachine({
      current: 'gallery',
      selectedPackId: selectedGalleryPackId || 'basic',
    });
  }

  const [machineState, setMachineState] = useState(() => machineRef.current!.getState());

  useEffect(() => {
    const unsub = machineRef.current!.subscribe((st: any) => {
      setMachineState(st);
    });
    return () => unsub();
  }, []);

  const transition = useCallback((action: { type: string; [key: string]: any }) => {
    return machineRef.current!.transition(action);
  }, []);

  const handleDocumentUploadFlow = useCallback(
    async (file: File) => {
      const selectedPack = machineRef.current!.getState().selectedPackId || selectedGalleryPackId || 'basic';
      transition({ type: 'START_UPLOAD' });

      // Step 1: Create project
      setUploadProgress({
        isOpen: true,
        step: 'Đang khởi tạo bài giảng...',
        percent: 15,
        desc: `Tạo không gian làm việc với bộ mẫu [${selectedPack}] cho: ${file.name}`,
        icon: '📁',
      });

      let projectId = '';
      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        const projData = await api.createProject(title, selectedPack);
        projectId = projData.projectId;

        // Step 2: Upload document
        setUploadProgress({
          step: 'Đang bóc tách nội dung...',
          percent: 40,
          desc: `Trích xuất văn bản, cấu trúc luận điểm từ ${file.name}`,
          icon: '📤',
        });

        const docContext = await api.uploadDocument(projectId, file);

        // Fetch suggested questions
        let questions: Array<{ id: string; question: string; suggestedAnswer?: string; options?: string[] }> = [];
        try {
          const qData = await api.getClarification(projectId);
          questions = qData.questions || [];
        } catch (e) {
          console.warn('[Flow] Using default clarification questions:', e);
        }

        // Hide progress modal and open clarification
        setUploadProgress({ isOpen: false });
        openClarificationModal(questions, docContext.title || file.name, projectId);

        transition({
          type: 'UPLOAD_SUCCESS',
          projectId,
          needsClarification: true,
        });

        return { projectId, docContext };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploadProgress({
          isOpen: true,
          step: 'Lỗi bóc tách tài liệu',
          percent: 0,
          desc: msg,
          icon: '⚠️',
        });
        transition({ type: 'UPLOAD_ERROR', error: msg });
        throw err;
      }
    },
    [selectedGalleryPackId, setUploadProgress, openClarificationModal, transition]
  );

  return {
    state: machineState,
    transition,
    handleDocumentUploadFlow,
  };
}
