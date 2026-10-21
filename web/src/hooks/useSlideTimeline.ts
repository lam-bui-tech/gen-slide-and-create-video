'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { buildGsapTimelineForSlide } from '@templates/index.js';
import { computeSlideHash } from '@/lib/editableSelectors';
import type { SlideScene } from '@schemas/types';

// Ensure global gsap is available for shared templates engine
if (typeof window !== 'undefined') {
  (window as any).gsap = gsap;
}

export function useSlideTimeline(
  containerRef: React.RefObject<HTMLElement | null>,
  slide: SlideScene | any
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const totalDuration = slide?.durationSeconds || 16.0;
  const slideHash = computeSlideHash(slide);

  // Sync video element time with slide timeline
  const syncVideoTime = useCallback((time: number) => {
    if (!containerRef.current) return;
    const vid = containerRef.current.querySelector('video') as HTMLVideoElement | null;
    if (!vid) return;
    const trimStart = parseFloat(vid.getAttribute('data-media-start') || '0');
    const trimEnd = parseFloat(vid.getAttribute('data-media-end') || String(vid.duration || 9999));
    const targetTime = trimStart + time;
    if (targetTime <= trimEnd) {
      vid.currentTime = targetTime;
    }
  }, [containerRef]);

  const slideRef = useRef(slide);
  slideRef.current = slide;

  // GSAP Context effect: builds and cleans up timeline idempotently
  useEffect(() => {
    if (!containerRef.current || !slideRef.current) return;
    const container = containerRef.current;
    const currentSlideData = slideRef.current;

    // Reset state for new slide
    setCurrentTime(0);
    setIsPlaying(false);

    const ctx = gsap.context(() => {
      const tl = buildGsapTimelineForSlide(currentSlideData, container);
      if (tl) {
        timelineRef.current = tl;

        // Register on window.__timelines per HyperFrames standard
        if (typeof window !== 'undefined') {
          const w = window as any;
          w.__timelines = w.__timelines || {};
          w.__timelines['active-slide'] = tl;
          if (currentSlideData?.slideId) {
            w.__timelines[currentSlideData.slideId] = tl;
          }
        }

        // WYSIWYG Studio mode: set to progress(1) initially so user sees final state
        tl.progress(1);

        tl.eventCallback('onUpdate', () => {
          const t = tl.time();
          setCurrentTime(t);
          syncVideoTime(t);
        });

        tl.eventCallback('onComplete', () => {
          setIsPlaying(false);
          const vid = container.querySelector('video') as HTMLVideoElement | null;
          if (vid) vid.pause();
        });
      }
    }, container);

    return () => {
      ctx.revert();
      timelineRef.current = null;
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w.__timelines) {
          delete w.__timelines['active-slide'];
          if (currentSlideData?.slideId) {
            delete w.__timelines[currentSlideData.slideId];
          }
        }
      }
    };
  }, [slideHash, syncVideoTime, containerRef]);

  const play = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    setIsPlaying(true);

    if (tl.progress() >= 1 || tl.time() === 0) {
      tl.restart();
    } else {
      tl.play();
    }

    if (containerRef.current) {
      const vid = containerRef.current.querySelector('video') as HTMLVideoElement | null;
      if (vid) vid.play().catch(() => {});
    }
  }, [containerRef]);

  const pause = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    setIsPlaying(false);
    tl.pause();

    if (containerRef.current) {
      const vid = containerRef.current.querySelector('video') as HTMLVideoElement | null;
      if (vid) vid.pause();
    }
  }, [containerRef]);

  const stop = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    setIsPlaying(false);
    tl.progress(1);
    setCurrentTime(0);

    if (containerRef.current) {
      const vid = containerRef.current.querySelector('video') as HTMLVideoElement | null;
      if (vid) {
        vid.pause();
        const trimStart = parseFloat(vid.getAttribute('data-media-start') || '0');
        vid.currentTime = trimStart;
      }
    }
  }, [containerRef]);

  const seek = useCallback((time: number) => {
    const tl = timelineRef.current;
    if (!tl) return;
    setIsPlaying(false);
    tl.pause(time);
    setCurrentTime(time);
    syncVideoTime(time);
  }, [syncVideoTime]);

  return {
    isPlaying,
    currentTime,
    totalDuration,
    play,
    pause,
    stop,
    seek,
  };
}
