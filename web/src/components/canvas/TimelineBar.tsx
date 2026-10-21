'use client';

import React from 'react';
import { formatSeconds } from '@/lib/editableSelectors';

export interface TimelineBarProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
}

export function TimelineBar({
  isPlaying,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onStop,
  onSeek,
}: TimelineBarProps) {
  const maxDur = Math.max(1.0, totalDuration || 16.0);

  return (
    <div className="canvas-timeline-bar">
      <button
        className="timeline-playback-btn"
        id="btn-timeline-play"
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? 'Tạm dừng' : 'Phát hoạt họa slide này'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        className="timeline-stop-btn"
        id="btn-timeline-stop"
        onClick={onStop}
        title="Dừng và về 0s"
      >
        ⏹
      </button>

      <div className="timeline-scrubber-track">
        <div className="timeline-time-info">
          <span id="time-current">{formatSeconds(currentTime)}</span>
          <span id="time-total">{formatSeconds(maxDur)}</span>
        </div>
        <input
          type="range"
          className="timeline-slider"
          id="timeline-slider"
          min="0"
          max={maxDur}
          step="0.05"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          onInput={(e) => onSeek(parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    </div>
  );
}
