'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function ClarificationModal() {
  const isClarificationOpen = useStudioStore((s) => s.isClarificationOpen);
  const clarificationDocTitle = useStudioStore((s) => s.clarificationDocTitle);
  const closeClarificationModal = useStudioStore((s) => s.closeClarificationModal);
  const setUploadProgress = useStudioStore((s) => s.setUploadProgress);
  const openOutlineReviewModal = useStudioStore((s) => s.openOutlineReviewModal);
  const scene = useStudioStore((s) => s.scene);
  const currentUploadProjectId = useStudioStore((s) => s.currentUploadProjectId);

  const [audience, setAudience] = useState('Sinh viên đại học năm thứ nhất');
  const [duration, setDuration] = useState('15');
  const [slides, setSlides] = useState('10');
  const [quiz, setQuiz] = useState('true');
  const [voice, setVoice] = useState('MyDuyen');

  if (!isClarificationOpen) return null;

  const handleProceed = async (answers: any) => {
    closeClarificationModal();
    const projectId = currentUploadProjectId || scene?.projectId || 'sample';

    setUploadProgress({
      isOpen: true,
      step: 'Đang sinh dàn bài sư phạm...',
      percent: 70,
      desc: `Gemini AI phân bổ ${answers.slideCount} slides (${answers.durationMinutes} phút)`,
      icon: '🧠',
    });

    try {
      await api.submitClarification(projectId, answers);
      const outline = await api.generateOutline(projectId);
      setUploadProgress({ isOpen: false });
      openOutlineReviewModal(outline);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadProgress({
        isOpen: true,
        step: 'Sinh dàn bài thất bại',
        percent: 0,
        desc: msg,
        icon: '⚠️',
      });
    }
  };

  const handleSubmit = () => {
    handleProceed({
      targetAudience: audience,
      durationMinutes: parseInt(duration, 10) || 15,
      slideCount: parseInt(slides, 10) || 10,
      includeQuiz: quiz === 'true',
      voiceOver: voice,
      style: 'academic-ocean',
    });
  };

  const handleSkip = () => {
    handleProceed({
      targetAudience: 'Sinh viên đại học năm thứ nhất',
      durationMinutes: 15,
      slideCount: 10,
      includeQuiz: true,
      voiceOver: 'MyDuyen',
      style: 'academic-ocean',
    });
  };

  return (
    <div
      id="clarification-modal"
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clarification-modal-title"
    >
      <div
        className="modal-box"
        style={{
          maxWidth: '560px',
          textAlign: 'left',
          padding: '24px',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ fontSize: '30px' }}>🎯</div>
          <div>
            <h3
              id="clarification-modal-title"
              style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}
            >
              Thiết lập Sư phạm cho Bài giảng
            </h3>
            <p
              id="clarification-doc-title"
              style={{
                fontSize: '13px',
                color: 'var(--primary)',
                fontWeight: 500,
                margin: '4px 0 0 0',
              }}
            >
              {clarificationDocTitle || 'Tài liệu bài học...'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
          <div>
            <label
              htmlFor="clarify-audience"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px', cursor: 'pointer' }}
            >
              1. Đối tượng người học trọng tâm là ai?
            </label>
            <select
              id="clarify-audience"
              aria-label="Đối tượng người học trọng tâm"
              className="prop-select"
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="Sinh viên đại học năm thứ nhất">Sinh viên đại học năm thứ nhất (Nhập môn, dễ hiểu)</option>
              <option value="Sinh viên chuyên ngành nâng cao">Sinh viên chuyên ngành nâng cao (Hàn lâm, chuyên sâu)</option>
              <option value="Học sinh THPT">Học sinh THPT (Trực quan, sinh động)</option>
              <option value="Người đi làm / Chuyên gia">Người đi làm / Chuyên gia (Ứng dụng thực tiễn)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="clarify-duration"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px', cursor: 'pointer' }}
              >
                2. Thời lượng bài giảng
              </label>
              <select
                id="clarify-duration"
                aria-label="Thời lượng bài giảng"
                className="prop-select"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="5">5 phút (Ngắn gọn / Tóm tắt)</option>
                <option value="10">10 phút (Chuẩn)</option>
                <option value="15">15 phút (Đầy đủ chi tiết)</option>
                <option value="20">20 phút (Chuyên đề sâu)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="clarify-slides"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px', cursor: 'pointer' }}
              >
                3. Số lượng slide
              </label>
              <select
                id="clarify-slides"
                aria-label="Số lượng slide"
                className="prop-select"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                value={slides}
                onChange={(e) => setSlides(e.target.value)}
              >
                <option value="6">6 slides</option>
                <option value="8">8 slides</option>
                <option value="10">10 slides (Khuyến nghị)</option>
                <option value="12">12 slides</option>
                <option value="15">15 slides</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="clarify-quiz"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px', cursor: 'pointer' }}
              >
                4. Câu hỏi trắc nghiệm
              </label>
              <select
                id="clarify-quiz"
                aria-label="Kèm câu hỏi trắc nghiệm"
                className="prop-select"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                value={quiz}
                onChange={(e) => setQuiz(e.target.value)}
              >
                <option value="true">Có kèm Quiz kiểm tra nhanh</option>
                <option value="false">Không (Chỉ giảng lý thuyết)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="clarify-voice"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px', cursor: 'pointer' }}
              >
                5. Giọng đọc thuyết minh (TTS)
              </label>
              <select
                id="clarify-voice"
                aria-label="Giọng đọc thuyết minh TTS"
                className="prop-select"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                <option value="MyDuyen">Mỹ Duyên (Nữ Nam Bộ)</option>
                <option value="HaMy">Hà My (Nữ Bắc Bộ)</option>
                <option value="BanMai">Ban Mai (Nữ Bắc Bộ)</option>
                <option value="Viettel">Viettel (Chuẩn hàn lâm)</option>
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
          }}
        >
          <button
            id="btn-clarify-skip"
            className="btn btn-secondary"
            onClick={handleSkip}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Bỏ qua & Dùng mặc định
          </button>
          <button
            id="btn-clarify-submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
          >
            🚀 Bắt đầu sinh bài giảng
          </button>
        </div>
      </div>
    </div>
  );
}
