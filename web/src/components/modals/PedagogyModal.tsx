'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { auditDeckQuality } from '@engine/quality.js';

export function PedagogyModal() {
  const isPedagogyModalOpen = useStudioStore((s) => s.isPedagogyModalOpen);
  const closePedagogyModal = useStudioStore((s) => s.closePedagogyModal);
  const scene = useStudioStore((s) => s.scene);
  const setSlideIndex = useStudioStore((s) => s.setSlideIndex);

  if (!isPedagogyModalOpen || !scene) return null;

  const report = auditDeckQuality(scene) || {
    score: 100,
    totalSlides: scene.slides?.length || 0,
    passedSlides: scene.slides?.length || 0,
    errorCount: 0,
    warningCount: 0,
    issuesBySlide: {},
  };

  const score = report.score ?? 100;
  const ratingLabel =
    score >= 90 ? 'Rất Tốt' : score >= 75 ? 'Tốt' : score >= 60 ? 'Trung Bình' : 'Cần Cải Thiện';
  const scoreColor = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#EF4444';

  const allIssues: Array<{ slideIndex: number; rule: string; message: string; severity: string }> =
    (report.issues || []).map((iss) => ({
      slideIndex: iss.slideIndex ?? 0,
      rule: iss.rule || 'Chuẩn sư phạm',
      message: iss.message || '',
      severity: iss.level || 'warning',
    }));

  const errorCount = report.summary?.errors ?? allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = report.summary?.warnings ?? allIssues.filter((i) => i.severity === 'warning').length;
  const passedCount = report.summary?.passedSlides ?? (scene.slides?.length || 0) - (errorCount > 0 ? 1 : 0);

  const handleJumpToSlide = (idx: number) => {
    setSlideIndex(idx);
    closePedagogyModal();
  };

  return (
    <div
      className="modal-overlay open"
      id="pedagogy-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pedagogy-modal-title"
    >
      <div
        className="modal-box"
        style={{
          width: '760px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '22px',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
            marginBottom: '14px',
          }}
        >
          <div>
            <h3
              id="pedagogy-modal-title"
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#0369A1',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🎯</span> Bảng Kiểm Tra Chất Lượng Sư Phạm (P7.4)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-sub)', margin: '4px 0 0 0' }}>
              Đánh giá tự động theo các tiêu chuẩn: mật độ chữ, tốc độ đọc narration, thời lượng slide
              và khả năng tiếp thu.
            </p>
          </div>
          <button
            className="btn btn-secondary btn-icon"
            id="btn-close-pedagogy-modal"
            aria-label="Đóng bảng kiểm tra sư phạm"
            onClick={closePedagogyModal}
          >
            ✕
          </button>
        </div>

        {/* Score & Summary Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr',
            gap: '16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #E2E8F0',
              paddingRight: '12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>ĐIỂM SƯ PHẠM</div>
            <div
              id="pedagogy-score-val"
              style={{ fontSize: '32px', fontWeight: 900, color: scoreColor, lineHeight: 1.1 }}
            >
              {score}
            </div>
            <div id="pedagogy-rating-label" style={{ fontSize: '11px', fontWeight: 700, color: scoreColor }}>
              {ratingLabel}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', alignItems: 'center' }}>
            <div style={{ background: 'white', border: '1px solid #FECDD3', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#E11D48' }} id="pedagogy-error-count">
                {errorCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Lỗi cần sửa</div>
            </div>
            <div style={{ background: 'white', border: '1px solid #FED7AA', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }} id="pedagogy-warning-count">
                {warningCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Cảnh báo</div>
            </div>
            <div style={{ background: 'white', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }} id="pedagogy-passed-count">
                {passedCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Slide chuẩn</div>
            </div>
          </div>
        </div>

        {/* Issues List Table */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '45vh', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ background: '#F1F5F9', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ textAlign: 'left', color: '#475569', borderBottom: '1px solid #CBD5E1' }}>
                <th style={{ padding: '8px 10px', width: '75px' }}>Slide</th>
                <th style={{ padding: '8px 10px', width: '140px' }}>Quy chuẩn</th>
                <th style={{ padding: '8px 10px' }}>Chi tiết phát hiện & Khuyến nghị</th>
                <th style={{ padding: '8px 10px', width: '95px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody id="pedagogy-issues-tbody">
              {allIssues.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>
                    ✨ Tuyệt vời! Toàn bộ slide đều đạt chuẩn chất lượng sư phạm.
                  </td>
                </tr>
              ) : (
                allIssues.map((iss, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--primary)' }}>
                      #{iss.slideIndex + 1}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{iss.rule}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{iss.message}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleJumpToSlide(iss.slideIndex)}
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Đến slide
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
