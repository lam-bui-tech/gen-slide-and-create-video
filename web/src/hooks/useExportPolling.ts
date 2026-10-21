'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function useExportPolling(intervalMs = 1000, maxAttempts = 40) {
  const activeExport = useStudioStore((s) => s.activeExport);
  const setActiveExport = useStudioStore((s) => s.setActiveExport);
  const setUploadProgress = useStudioStore((s) => s.setUploadProgress);

  const attemptRef = useRef(0);
  const activeExportRef = useRef(activeExport);
  activeExportRef.current = activeExport;

  const exportId = activeExport?.exportId;
  const exportStatus = activeExport?.status;

  useEffect(() => {
    if (!exportId || exportStatus === 'completed' || exportStatus === 'failed') {
      return;
    }

    attemptRef.current = 0;
    const current = activeExportRef.current;
    if (current) {
      setUploadProgress({
        isOpen: true,
        step: `Đang kết xuất ${current.type}...`,
        percent: current.progress || 25,
        desc: 'Hệ thống đang tiến hành kết xuất, vui lòng chờ trong giây lát...',
        icon: '⚙️',
      });
    }

    const timer = setInterval(async () => {
      attemptRef.current += 1;
      const latest = activeExportRef.current;
      if (!latest || latest.exportId !== exportId) {
        clearInterval(timer);
        return;
      }

      if (attemptRef.current >= maxAttempts) {
        clearInterval(timer);
        setActiveExport({
          ...latest,
          status: 'failed',
          error: 'Quá thời gian chờ kết xuất (timeout). Vui lòng thử lại.',
        });
        setUploadProgress({ isOpen: false });
        alert(`Quá thời gian chờ kết xuất ${latest.type}. Vui lòng thử lại.`);
        return;
      }

      try {
        const job = await api.getExportStatus(latest.exportId);

        if (job.status === 'completed' && job.downloadUrl) {
          clearInterval(timer);
          setActiveExport({
            ...latest,
            status: 'completed',
            progress: 100,
            downloadUrl: job.downloadUrl,
          });

          setUploadProgress({
            isOpen: true,
            step: `✅ Hoàn tất kết xuất ${latest.type}!`,
            percent: 100,
            desc: `Đã hoàn tất kết xuất tệp. Nhấp vào nút bên dưới để tải về máy.`,
            icon: '🎉',
          });

          if (typeof window !== 'undefined' && job.downloadUrl) {
            try {
              window.open(job.downloadUrl, '_blank');
            } catch {
              // Ignore popup blockers
            }
          }
          return;
        }

        if (job.status === 'failed') {
          clearInterval(timer);
          const errorMsg = job.error || 'Quá trình kết xuất thất bại.';
          setActiveExport({
            ...latest,
            status: 'failed',
            error: errorMsg,
          });
          setUploadProgress({
            isOpen: false,
          });
          alert(`Lỗi kết xuất ${latest.type}: ${errorMsg}`);
          return;
        }

        // Still in progress
        const updatedProgress = Math.min(95, (latest.progress || 25) + 5);
        setActiveExport({
          ...latest,
          status: 'rendering',
          progress: updatedProgress,
        });
        setUploadProgress({
          percent: updatedProgress,
        });
      } catch (err) {
        console.warn('[useExportPolling] Polling tick error:', err);
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [exportId, exportStatus, setActiveExport, setUploadProgress, intervalMs, maxAttempts]);

  return {
    activeExport,
  };
}
