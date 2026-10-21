'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useStudioStore } from '@/store/useStudioStore';
import { useFlowMachine } from '@/hooks/useFlowMachine';
import { api } from '@/lib/api';

export function Navbar() {
  const { handleDocumentUploadFlow } = useFlowMachine();
  const scene = useStudioStore((s) => s.scene);
  const historyIndex = useStudioStore((s) => s.historyIndex);
  const history = useStudioStore((s) => s.history);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const isAudioJobRunning = useStudioStore((s) => s.isAudioJobRunning);

  const dispatch = useStudioStore((s) => s.dispatch);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const createNewEmptyProject = useStudioStore((s) => s.createNewEmptyProject);
  const openPedagogyModal = useStudioStore((s) => s.openPedagogyModal);
  const openHelpModal = useStudioStore((s) => s.openHelpModal);
  const openPresentationMode = useStudioStore((s) => s.openPresentationMode);
  const setActiveExport = useStudioStore((s) => s.setActiveExport);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim();
    if (scene && scene.title !== newTitle) {
      dispatch({
        type: 'UPDATE_SLIDE',
        payload: { slideIndex: 0, changes: {} }, // trigger update
      }, 'Đổi tên bài giảng');
      useStudioStore.setState((state) => ({
        scene: state.scene ? { ...state.scene, title: newTitle } : null,
      }));
    }
  };

  const handleNewProject = () => {
    if (window.confirm('Tạo bài giảng mới sạch hoàn toàn? Mọi thay đổi chưa lưu sẽ bị ghi đè.')) {
      createNewEmptyProject();
    }
  };

  const handleExport = async (type: 'mp4' | 'pdf' | 'pptx') => {
    if (!scene || !scene.projectId) {
      alert('Không tìm thấy projectId để xuất bài giảng.');
      return;
    }
    try {
      // Autosave current scene before export
      await api.saveScene(scene.projectId, scene);
      const res = await api.startExport(scene.projectId, type);
      if (type === 'mp4') {
        alert(`🎬 Đã khởi tạo tiến trình kết xuất MP4 (Job ID: ${res.exportId})!\nHệ thống đang chạy ngầm bằng HyperFrames CLI 1080p.`);
      }
      setActiveExport({
        exportId: res.exportId,
        type: type.toUpperCase(),
        status: 'rendering',
        progress: 10,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi xuất ${type.toUpperCase()}: ${msg}`);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await handleDocumentUploadFlow(file);
    } catch (err: unknown) {
      console.error('[Navbar] Document upload error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const saveLabel =
    saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'saving' ? 'Đang lưu...' : 'Lỗi lưu';
  const saveDotColor =
    saveStatus === 'saved' ? '#047857' : saveStatus === 'saving' ? '#D97706' : '#DC2626';

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header className="studio-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <Link href="/" className="nav-brand" title="Về Thư Viện Mẫu (Gallery)">
          <div className="nav-brand-badge">⚡</div>
          <span>AI Lecture Studio</span>
        </Link>
        <label htmlFor="project-title-input" className="sr-only">
          Tên bài giảng
        </label>
        <input
          type="text"
          id="project-title-input"
          aria-label="Tên bài giảng"
          className="nav-project-title"
          defaultValue={scene?.title || 'Bài Giảng Mới'}
          key={scene?.title}
          onBlur={handleTitleBlur}
          title="Nhấp để đổi tên bài giảng"
        />
        <div id="save-status" role="status" aria-live="polite" className={`save-indicator ${saveStatus}`}>
          <span style={{ color: saveDotColor, marginRight: '4px' }}>●</span> {saveLabel}
        </div>
      </div>

      <div className="nav-actions">
        <button
          className="btn btn-secondary"
          id="btn-new-project"
          onClick={handleNewProject}
          title="Tạo bài giảng mới sạch hoàn toàn"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#075985',
            background: '#F0F9FF',
            borderColor: '#BAE6FD',
            minHeight: '32px',
          }}
        >
          ✨ Tạo Mới
        </button>

        <button
          className="btn btn-primary"
          id="btn-upload-doc"
          onClick={() => fileInputRef.current?.click()}
          title="Tải lên tài liệu giáo án bài giảng (hỗ trợ .pptx, .pdf, .docx, .md)"
          style={{
            background: 'linear-gradient(135deg, #0369A1, #075985)',
            color: 'white',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '6px',
            minHeight: '32px',
          }}
        >
          📥 Tải Tài Liệu
        </button>
        <input
          type="file"
          id="input-doc-file"
          ref={fileInputRef}
          aria-label="Tải lên tệp tài liệu bài giảng (.pptx, .pdf, .docx, .md)"
          accept=".pptx,.pdf,.docx,.md"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <button
          className="btn btn-secondary"
          id="btn-pedagogy-review"
          onClick={openPedagogyModal}
          title="Bảng kiểm tra chất lượng sư phạm (mật độ chữ, tốc độ đọc, trợ năng)"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#075985',
            borderColor: '#BAE6FD',
            background: '#E0F2FE',
            minHeight: '32px',
          }}
        >
          🎯 Sư Phạm (<span id="pedagogy-badge" style={{ color: '#075985', fontWeight: 700 }}>100%</span>)
        </button>

        <button
          className="btn btn-secondary"
          id="btn-help-guide"
          onClick={openHelpModal}
          title="Hướng dẫn sử dụng và trợ giúp (FAQ)"
          aria-label="Hướng dẫn sử dụng và trợ giúp phím tắt"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-main)',
            borderColor: 'var(--border-color)',
            background: '#F8FAFC',
            minHeight: '32px',
          }}
        >
          ❓ Trợ Giúp
        </button>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

        <button
          className="btn btn-secondary btn-icon"
          id="btn-undo"
          title="Hoàn tác (Ctrl+Z)"
          aria-label="Hoàn tác thay đổi vừa thực hiện"
          onClick={undo}
          disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed', minWidth: '32px', minHeight: '32px', padding: '6px 8px' }}
        >
          ↶
        </button>
        <button
          className="btn btn-secondary btn-icon"
          id="btn-redo"
          title="Làm lại (Ctrl+Y)"
          aria-label="Làm lại thao tác vừa hoàn tác"
          onClick={redo}
          disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed', minWidth: '32px', minHeight: '32px', padding: '6px 8px' }}
        >
          ↷
        </button>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

        <button
          className="btn btn-primary"
          id="btn-presentation-mode"
          onClick={openPresentationMode}
          title="Trình chiếu toàn màn hình toàn bộ bài giảng trước khi xuất MP4"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
            minHeight: '32px',
          }}
        >
          ▶ Trình Chiếu
        </button>

        <button
          className="btn btn-secondary"
          id="btn-export-pdf"
          onClick={() => handleExport('pdf')}
          disabled={isAudioJobRunning}
          title="Xuất toàn bộ bài giảng sang PDF vector"
          style={{ padding: '6px 10px', fontSize: '12px', minHeight: '32px' }}
        >
          📄 PDF
        </button>
        <button
          className="btn btn-secondary"
          id="btn-export-pptx"
          onClick={() => handleExport('pptx')}
          disabled={isAudioJobRunning}
          title="Xuất bài giảng sang PPTX (Image Pack)"
          style={{ padding: '6px 10px', fontSize: '12px', minHeight: '32px' }}
        >
          📊 PPTX
        </button>
        <button
          className="btn btn-primary"
          id="btn-export-mp4"
          onClick={() => handleExport('mp4')}
          disabled={isAudioJobRunning}
          title="Render video bài giảng 1080p qua HyperFrames CLI"
          style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, minHeight: '32px' }}
        >
          🎬 Xuất MP4
        </button>
      </div>
    </header>
  );
}
