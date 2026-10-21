'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { CanvasPaneFrame } from '@/components/shell/CanvasPaneFrame';
import { SlideCanvas } from '@/components/canvas/SlideCanvas';
import { TimelineBar } from '@/components/canvas/TimelineBar';
import { BuilderCanvas } from '@/components/builder/BuilderCanvas';
import { BuilderToolbar } from '@/components/builder/BuilderToolbar';
import { useSlideTimeline } from '@/hooks/useSlideTimeline';

export function CanvasArea() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const scene = useStudioStore((s) => s.scene);
  const currentSlideIndex = useStudioStore((s) => s.currentSlideIndex);
  const mode = useStudioStore((s) => s.mode);

  const currentSlide = scene?.slides?.[currentSlideIndex];
  const timeline = useSlideTimeline(canvasRef, currentSlide);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {mode === 'builder' && <BuilderToolbar />}
      <CanvasPaneFrame
        bottomBar={
          mode !== 'builder' ? (
            <TimelineBar
              isPlaying={timeline.isPlaying}
              currentTime={timeline.currentTime}
              totalDuration={timeline.totalDuration}
              onPlay={timeline.play}
              onPause={timeline.pause}
              onStop={timeline.stop}
              onSeek={timeline.seek}
            />
          ) : null
        }
      >
        {mode === 'builder' ? <BuilderCanvas /> : <SlideCanvas ref={canvasRef} />}
      </CanvasPaneFrame>
    </div>
  );
}
