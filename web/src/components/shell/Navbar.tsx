'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function Navbar() {
  const scene = useStudioStore((s) => s.scene);
  const historyIndex = useStudioStore((s) => s.historyIndex);
  const history = useStudioStore((s) => s.history);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const isAudioJobRunning = useStudioStore((s) => s.isAudioJobRunning);

  const dispatch = useStudioStore((s) => s.dispatch);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const createNewEmptyProject = useStudioStore((s) => s.createNewEmptyProject);
  const openGalleryModal = useStudioStore((s) => s.openGalleryModal);
  const openPedagogyModal = useStudioStore((s) => s.openPedagogyModal);
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openGalleryModal('upload');
  };

  const packLabel = (scene as any)?.templatePackId || scene?.packId || 'basic';
  const saveLabel =
    saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'saving' ? 'Đang lưu...' : 'Lỗi lưu';
  const saveDotColor =
    saveStatus === 'saved' ? '#10B981' : saveStatus === 'saving' ? '#F59E0B' : '#EF4444';

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header className="studio-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link href="/" className="nav-brand" title="Về Thư Viện Mẫu (Gallery)">
          <div className="nav-brand-badge">⚡</div>
          <span>AI Lecture Studio</span>
        </Link>
        <input
          type="text"
          id="project-title-input"
          className="nav-project-title"
          defaultValue={scene?.title || 'Chương 1: Triết Học & Thế Giới Quan'}
          key={scene?.title}
          onBlur={handleTitleBlur}
          title="Nhấp để đổi tên bài giảng"
        />
        <div id="save-status" className={`save-indicator ${saveStatus}`}>
          <span style={{ color: saveDotColor, marginRight: '4px' }}>●</span> {saveLabel}
        </div>
      </div>

      <div className="nav-actions">
        <Link
          href="/"
          className="btn btn-secondary"
          id="btn-nav-gallery"
          title="Xem toàn bộ Thư Viện Mẫu Template (Gallery)"
          style={{ padding: '7px 12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          🏛️ Thư Viện
        </Link>

        <button
          className="btn btn-secondary"
          id="btn-new-project"
          onClick={handleNewProject}
          title="Tạo bài giảng mới sạch hoàn toàn"
          style={{
            padding: '7px 14px',
            fontWeight: 700,
            color: '#0284C7',
            background: '#F0F9FF',
            borderColor: '#BAE6FD',
          }}
        >
          ✨ Tạo Bài Mới
        </button>

        <button
          className="btn btn-secondary"
          id="btn-select-pack"
          onClick={() => openGalleryModal('switch-pack')}
          title="Chọn hoặc thay đổi Bộ Mẫu Giảng Dạy (Template Pack)"
          style={{ padding: '7px 14px', fontWeight: 600 }}
        >
          🎨 Bộ Mẫu (<span id="current-pack-label">{packLabel}</span>)
        </button>

        <button
          className="btn btn-primary"
          id="btn-upload-doc"
          onClick={() => openGalleryModal('upload')}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: 'white',
            padding: '7px 16px',
            fontWeight: 700,
          }}
        >
          📥 Tải Tài Liệu (PPTX/PDF/DOCX/MD)
        </button>
        <input
          type="file"
          id="input-doc-file"
          ref={fileInputRef}
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
            padding: '7px 12px',
            fontWeight: 600,
            color: '#0284C7',
            borderColor: '#BAE6FD',
            background: '#F0F9FF',
          }}
        >
          🎯 Sư Phạm (<span id="pedagogy-badge">100%</span>)
        </button>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          className="btn btn-secondary btn-icon"
          id="btn-undo"
          title="Hoàn tác (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          ↶
        </button>
        <button
          className="btn btn-secondary btn-icon"
          id="btn-redo"
          title="Làm lại (Ctrl+Y)"
          onClick={redo}
          disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
        >
          ↷
        </button>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)', margin: '0 6px' }} />

        <button
          className="btn btn-primary"
          id="btn-presentation-mode"
          onClick={openPresentationMode}
          title="Trình chiếu toàn màn hình toàn bộ bài giảng trước khi xuất MP4"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white',
            padding: '7px 16px',
            fontWeight: 700,
            border: 'none',
            boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
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
        >
          📄 Xuất PDF
        </button>
        <button
          className="btn btn-secondary"
          id="btn-export-pptx"
          onClick={() => handleExport('pptx')}
          disabled={isAudioJobRunning}
          title="Xuất bài giảng sang PPTX (Image Pack)"
        >
          📊 Xuất PPTX
        </button>
        <button
          className="btn btn-primary"
          id="btn-export-mp4"
          onClick={() => handleExport('mp4')}
          disabled={isAudioJobRunning}
          title="Render video bài giảng 1080p qua HyperFrames CLI"
        >
          🎬 Xuất MP4 (1080p)
        </button>
      </div>
    </header>
  );
}
