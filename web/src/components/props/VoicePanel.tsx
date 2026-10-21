'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { api } from '@/lib/api';

export const VOICE_OPTIONS = [
  { value: 'BanMai', label: 'VieNeu — Ban Mai (Nữ Miền Bắc)' },
  { value: 'MyDuyen', label: 'VieNeu — Mỹ Duyên (Nữ Miền Nam)' },
  { value: 'MinhQuang', label: 'VieNeu — Minh Quang (Nam Miền Bắc)' },
  { value: 'LeMinh', label: 'VieNeu — Lê Minh (Nam Miền Nam)' },
  { value: 'viettel-ai', label: 'Viettel AI — Giọng Chuẩn' },
];

export function VoicePanel() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const isAudioJobRunning = useStudioStore((s) => s.isAudioJobRunning);
  const setIsAudioJobRunning = useStudioStore((s) => s.setIsAudioJobRunning);
  const dispatch = useStudioStore((s) => s.dispatch);

  const [audioError, setAudioError] = useState(false);

  const slide = scene?.slides?.[currentSlideIndex];
  const voice = slide?.voice;
  const voiceId = voice?.voiceId || 'BanMai';
  const voiceDuration = voice?.durationSeconds || 0;
  const slideDuration = slide?.durationSeconds || 16.0;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoiceId = e.target.value;
    dispatch(
      {
        type: 'UPDATE_VOICE',
        payload: {
          slideIndex: currentSlideIndex,
          changes: { voiceId: newVoiceId },
        },
      },
      'Đổi giọng đọc'
    );
  };

  const handleRegenerateAudio = async () => {
    if (!scene || !slide) return;
    const narration = voice?.narration || '';
    if (!narration.trim()) {
      alert('Vui lòng nhập kịch bản thuyết minh trước khi tạo âm thanh.');
      return;
    }

    try {
      setIsAudioJobRunning(true);
      // Autosave scene so backend has latest narration and slide data
      try {
        await api.saveScene(scene.projectId, scene);
      } catch (saveErr) {
        console.warn('[VoicePanel] Autosave warning:', saveErr);
      }

      const res = await api.synthesizeAudio(
        scene.projectId,
        slide.slideId,
        narration,
        voiceId,
        voice?.provider || 'vieneu'
      );

      dispatch(
        {
          type: 'UPDATE_VOICE',
          payload: {
            slideIndex: currentSlideIndex,
            changes: {
              audioUrl: res.audioUrl,
              durationSeconds: res.durationSeconds,
            },
          },
        },
        'Cập nhật audio AI'
      );
      setAudioError(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[VoicePanel] Lỗi tạo giọng đọc AI:', msg);
      setAudioError(true);
    } finally {
      setIsAudioJobRunning(false);
    }
  };

  return (
    <div className="prop-section">
      <div className="prop-section-title">
        <span>Giọng Đọc & Lời Thoại</span>
        <span style={{ fontSize: '11px', color: 'var(--primary)' }}>VieNeu v3</span>
      </div>

      <div className="voice-stat-box">
        <div>
          <div style={{ fontWeight: 700, color: '#0369A1' }} id="voice-duration-label">
            🎙️ Audio: {voiceDuration}s
          </div>
          <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }} id="slide-duration-label">
            ⏱️ Slide: {slideDuration}s (Audio + 1.0s)
          </div>
        </div>
        <button
          className="btn btn-primary"
          id="btn-regen-voice"
          onClick={handleRegenerateAudio}
          disabled={isAudioJobRunning}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          {isAudioJobRunning ? '⏳ Đang tạo...' : '↻ Tạo Lại'}
        </button>
      </div>

      <div className="prop-group">
        <label className="prop-label" htmlFor="prop-voice-select">
          Giọng Đọc AI (TTS Speaker)
        </label>
        <select
          id="prop-voice-select"
          className="prop-select"
          value={voiceId}
          onChange={handleVoiceChange}
        >
          {VOICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="prop-group">
        <label className="prop-label">Nghe Thử Âm Thanh Đã Tạo</label>
        {voice?.audioUrl && !audioError ? (
          <audio
            id="slide-audio-player"
            key={voice.audioUrl}
            src={voice.audioUrl}
            controls
            style={{ width: '100%', height: '36px', borderRadius: '6px' }}
            onError={() => setAudioError(true)}
          />
        ) : (
          <div
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--text-sub)',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
            }}
          >
            Chưa có tệp âm thanh cho slide này.
          </div>
        )}
      </div>
    </div>
  );
}
