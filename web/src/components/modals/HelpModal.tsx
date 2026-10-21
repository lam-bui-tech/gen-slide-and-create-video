'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function HelpModal() {
  const isHelpModalOpen = useStudioStore((s) => s.isHelpModalOpen);
  const closeHelpModal = useStudioStore((s) => s.closeHelpModal);

  if (!isHelpModalOpen) return null;

  return (
    <div
      className="modal-overlay open"
      id="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="modal-box"
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>❓</span>
            <h2 id="help-modal-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Hướng Dẫn Sử Dụng & Trợ Giúp
            </h2>
          </div>
          <button
            className="btn btn-secondary btn-icon"
            id="btn-close-help-modal"
            onClick={closeHelpModal}
            aria-label="Đóng bảng hướng dẫn"
            style={{ minWidth: '32px', minHeight: '32px' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
          {/* Quick Guide */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              🚀 Quy trình 4 bước biên soạn bài giảng AI
            </h3>
            <ol style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)' }}>
              <li>
                <strong>Tải tài liệu:</strong> Nhấn <em>📥 Tải Tài Liệu</em> trên thanh công cụ để tải lên giáo án (.pptx, .pdf, .docx, .md). AI sẽ tự động phân tích và tạo dàn ý slide.
              </li>
              <li>
                <strong>Chỉnh sửa nội dung & bố cục:</strong> Bấm trực tiếp vào slide trên khung hình Canvas để sửa chữ, hoặc chọn biến thể bố cục (Layout Variant) ở bảng điều khiển bên phải.
              </li>
              <li>
                <strong>Kiểm tra sư phạm (Pedagogy Audit):</strong> Bấm <em>🎯 Sư Phạm</em> để kiểm tra mật độ chữ, tốc độ đọc và khả năng tiếp thu của người học.
              </li>
              <li>
                <strong>Trình chiếu & Xuất Video:</strong> Bấm <em>▶ Trình Chiếu</em> để xem trước toàn màn hình, hoặc bấm <em>🎬 Xuất MP4</em> để sinh video hoàn chỉnh 1080p.
              </li>
            </ol>
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              ⌨️ Phím tắt hữu ích
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <kbd style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Ctrl + Z</kbd>
                <span style={{ marginLeft: '8px', color: 'var(--text-main)' }}>Hoàn tác (Undo)</span>
              </div>
              <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <kbd style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Ctrl + Y</kbd>
                <span style={{ marginLeft: '8px', color: 'var(--text-main)' }}>Làm lại (Redo)</span>
              </div>
              <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <kbd style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Ctrl + K</kbd>
                <span style={{ marginLeft: '8px', color: 'var(--text-main)' }}>Tìm kiếm slide</span>
              </div>
              <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <kbd style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Alt + ← / →</kbd>
                <span style={{ marginLeft: '8px', color: 'var(--text-main)' }}>Chuyển slide trước/sau</span>
              </div>
            </div>
          </div>

          {/* FAQ & Support Contact */}
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '12px 16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0369A1', marginBottom: '6px' }}>
              💬 Cần trợ giúp thêm hoặc báo cáo sự cố?
            </h4>
            <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              Đội ngũ kỹ thuật hỗ trợ trực tuyến 24/7. Nếu bạn gặp trục trặc khi tạo âm thanh giọng đọc hoặc render video MP4, vui lòng liên hệ email:{' '}
              <a href="mailto:support@antigravity.vn" style={{ color: '#075985', fontWeight: 700, textDecoration: 'underline' }}>
                support@antigravity.vn
              </a>{' '}
              hoặc gửi câu hỏi vào mục <em>AI Copilot</em> tại thanh thuộc tính slide.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={closeHelpModal}
            style={{ padding: '8px 20px', fontWeight: 700, minHeight: '32px' }}
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
