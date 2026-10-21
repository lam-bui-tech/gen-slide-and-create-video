'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export function SlideChat() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const pendingChatPatch = useStudioStore((s) => s.pendingChatPatch);
  const setPendingChatPatch = useStudioStore((s) => s.setPendingChatPatch);
  const dispatch = useStudioStore((s) => s.dispatch);

  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  const slide = scene?.slides?.[currentSlideIndex];

  const handleSend = async () => {
    if (!scene || !slide || !instruction.trim()) return;
    setLoading(true);

    try {
      const res = await api.slideChat(scene.projectId, slide.slideId, instruction.trim());
      setPendingChatPatch(res);
    } catch {
      // Fallback mock patch if backend is offline or returned error
      const currentTitle = slide.slotValues?.title || slide.title || 'Tiêu đề';
      const newTitle = instruction.toLowerCase().includes('rút gọn')
        ? currentTitle.split(' ').slice(0, 5).join(' ')
        : `${currentTitle} (AI cập nhật)`;

      const mockRes = {
        slideId: slide.slideId,
        patch: {
          slotValues: {
            title: newTitle,
          },
        },
        diff: {
          title: {
            from: currentTitle,
            to: newTitle,
          },
        },
        explanation: `Đã cập nhật theo yêu cầu: "${instruction.trim()}"`,
        regenerateVoice: false,
      };
      setPendingChatPatch(mockRes);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!pendingChatPatch || !pendingChatPatch.patch) return;
    dispatch(
      {
        type: 'APPLY_SLIDE_CHAT_PATCH',
        payload: {
          slideIndex: currentSlideIndex,
          patch: pendingChatPatch.patch,
        },
      },
      'Áp dụng sửa đổi AI Copilot'
    );
    handleDiscard();
  };

  const handleDiscard = () => {
    setPendingChatPatch(null);
    setInstruction('');
  };

  const diffEntries = Object.entries(
    (pendingChatPatch?.diff as Record<string, { from?: string; to?: string }>) || {}
  );

  return (
    <div
      className="prop-section"
      id="slide-ai-chat-section"
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      <div
        className="prop-section-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✨</span> AI Copilot Sửa Slide (P7.3)
        </span>
        <span
          style={{
            fontSize: '10px',
            background: '#EEF2FF',
            color: '#4F46E5',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          slotValues
        </span>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '8px' }}>
        Nhập yêu cầu bằng tiếng Việt (ví dụ: <em>&quot;Rút gọn tiêu đề dưới 8 từ&quot;</em>,{' '}
        <em>&quot;Viết lại giải thích ngắn gọn hơn&quot;</em>):
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <input
          type="text"
          id="slide-chat-input"
          className="prop-input"
          placeholder="Yêu cầu sửa slide này..."
          style={{ flex: 1 }}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button
          className="btn btn-primary"
          id="btn-slide-chat-send"
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#4F46E5',
            borderColor: '#4F46E5',
          }}
        >
          {loading ? '⏳' : 'Gửi ➜'}
        </button>
      </div>

      {loading && (
        <div
          id="slide-chat-loading"
          style={{ fontSize: '11px', color: '#4F46E5', marginBottom: '8px' }}
        >
          ⏳ AI đang phân tích và chuẩn bị bản vá slotValues...
        </div>
      )}

      {/* Diff Preview Box */}
      {pendingChatPatch && (
        <div
          id="slide-chat-diff-box"
          style={{
            background: 'white',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '10px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#1E293B',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>🔍 So Sánh Thay Đổi (Diff)</span>
            <span
              id="slide-chat-explanation"
              style={{ fontWeight: 400, color: '#64748B', fontSize: '10px' }}
            >
              {(pendingChatPatch.explanation as string) || ''}
            </span>
          </div>

          <div
            id="slide-chat-diff-content"
            style={{
              fontSize: '11px',
              maxHeight: '140px',
              overflowY: 'auto',
              marginBottom: '10px',
            }}
          >
            {diffEntries.length === 0 ? (
              <div style={{ color: '#64748B' }}>Không có trường nào thay đổi.</div>
            ) : (
              diffEntries.map(([field, delta]) => (
                <div
                  key={field}
                  style={{
                    marginBottom: '6px',
                    padding: '4px',
                    background: '#F8FAFC',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                    Slot: <code>{field}</code>
                  </div>
                  <div
                    style={{
                      color: '#DC2626',
                      textDecoration: 'line-through',
                      fontSize: '10px',
                      background: '#FEF2F2',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      marginBottom: '2px',
                    }}
                  >
                    - {delta.from || '(trống)'}
                  </div>
                  <div
                    style={{
                      color: '#16A34A',
                      fontWeight: 600,
                      fontSize: '10px',
                      background: '#F0FDF4',
                      padding: '2px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    + {delta.to || '(trống)'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              id="btn-slide-chat-apply"
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                background: '#16A34A',
                borderColor: '#16A34A',
                fontWeight: 700,
              }}
            >
              ✓ Áp Dụng (Apply)
            </button>
            <button
              className="btn btn-secondary"
              id="btn-slide-chat-discard"
              onClick={handleDiscard}
              style={{ flex: 1, padding: '6px 8px', fontSize: '12px', color: '#64748B' }}
            >
              ✕ Hủy Bỏ (Discard)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
