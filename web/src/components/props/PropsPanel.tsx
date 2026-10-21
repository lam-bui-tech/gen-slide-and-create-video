'use client';

import React from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { TemplateSelect } from './TemplateSelect';
import { VariantGrid } from './VariantGrid';
import { MediaStrip } from './MediaStrip';
import { VideoInspector } from './VideoInspector';
import { VoicePanel } from './VoicePanel';
import { NarrationBox } from './NarrationBox';
import { AnimationList } from './AnimationList';
import { NotesBox } from './NotesBox';
import { SlideChat } from './SlideChat';

export function PropsPanel() {
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);

  const slide = scene?.slides?.[currentSlideIndex];
  if (!slide) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-sub)', fontSize: '13px' }}>
        Chưa có slide nào được chọn.
      </div>
    );
  }

  return (
    <>
      <div className="props-header">Thuộc Tính & Giọng Đọc</div>

      {/* 1. Template & Layout Variant */}
      <div className="prop-section">
        <div className="prop-section-title">Mẫu & Bố Cục</div>
        <TemplateSelect />
        <VariantGrid />
      </div>

      {/* 1b. Media Strip UI */}
      <MediaStrip />

      {/* 1c. Video Component UI (shown if video is present) */}
      <VideoInspector />

      {/* 2. Voice-Over & Audio-First Sync */}
      <div className="prop-section">
        <VoicePanel />
        <NarrationBox />
      </div>

      {/* 3. Animation Presets & Cues */}
      <AnimationList />

      {/* 4. Speaker Notes */}
      <NotesBox />

      {/* 5. Per-Slide AI Copilot Chat */}
      <SlideChat />
    </>
  );
}
