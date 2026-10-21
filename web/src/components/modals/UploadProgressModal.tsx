'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function UploadProgressModal() {
  const uploadProgress = useStudioStore((s) => s.uploadProgress);
  const setUploadProgress = useStudioStore((s) => s.setUploadProgress);
  const activeExport = useStudioStore((s) => s.activeExport);
  const setActiveExport = useStudioStore((s) => s.setActiveExport);

  if (!uploadProgress.isOpen) return null;

  const isError = uploadProgress.icon === '⚠️' || uploadProgress.step.includes('thất bại') || uploadProgress.step.includes('Lỗi');

  return (
    <div id="upload-progress-modal" className="modal-overlay open">
      <div className="modal-box" style={{ textAlign: 'center', maxWidth: '440px', padding: '28px' }}>
        <div style={{ fontSize: '42px', marginBottom: '12px' }} id="upload-step-icon">
          {uploadProgress.icon || '📤'}
        </div>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: isError ? '#E11D48' : 'var(--text-main)',
            marginBottom: '8px',
          }}
          id="upload-step-title"
        >
          {uploadProgress.step}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '20px' }} id="upload-step-desc">
          {uploadProgress.desc}
        </p>
        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#E2E8F0',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: isError ? '16px' : '0',
          }}
        >
          <div
            id="upload-progress-bar"
            style={{
              width: `${uploadProgress.percent}%`,
              height: '100%',
              background: isError
                ? '#EF4444'
                : 'linear-gradient(90deg, #0284c7, #38bdf8)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {activeExport?.status === 'completed' && activeExport?.downloadUrl && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <a
              href={activeExport.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              id="btn-download-export-file"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '14px',
                background: '#0284c7',
                borderRadius: '8px',
                color: 'white',
              }}
            >
              <span>📥</span> Mở / Tải Về Tệp {activeExport.type}
            </a>
            <button
              className="btn btn-secondary"
              id="btn-close-export-done"
              onClick={() => {
                setUploadProgress({ isOpen: false });
                setActiveExport(null);
              }}
              style={{ padding: '5px 16px', fontSize: '12px' }}
            >
              Đóng Hộp Thoại
            </button>
          </div>
        )}

        {isError && (
          <button
            className="btn btn-secondary"
            onClick={() => setUploadProgress({ isOpen: false })}
            style={{ marginTop: '12px' }}
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}
