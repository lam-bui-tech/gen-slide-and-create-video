'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import { renderSlide, buildGsapTimelineForSlide } from '@templates/index.js';
import { formatSeconds } from '@/lib/editableSelectors';
import gsap from 'gsap';

export function usePresentation(stageRef: React.RefObject<HTMLDivElement | null>, containerRef: React.RefObject<HTMLDivElement | null>) {
  const scene = useStudioStore((s) => s.scene);
  const isPresentationActive = useStudioStore((s) => s.isPresentationActive);
  const presentationIndex = useStudioStore((s) => s.presentationIndex);
  const presentationIsPlaying = useStudioStore((s) => s.presentationIsPlaying);

  const closePresentationMode = useStudioStore((s) => s.closePresentationMode);
  const setPresentationIndex = useStudioStore((s) => s.setPresentationIndex);
  const setPresentationPlaying = useStudioStore((s) => s.setPresentationPlaying);

  const [currentTimeStr, setCurrentTimeStr] = useState('00:00.0');
  const [totalTimeStr, setTotalTimeStr] = useState('00:16.0');
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [stageScale, setStageScale] = useState(1);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const slides = useMemo(() => scene?.slides || [], [scene?.slides]);

  // Stage scaling calculation
  const updateStageScale = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / 1920, vh / 1080) * 0.96;
    setStageScale(scale);
  }, []);

  useEffect(() => {
    if (!isPresentationActive) return;
    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    return () => window.removeEventListener('resize', updateStageScale);
  }, [isPresentationActive, updateStageScale]);

  // HUD auto-hide timer
  const resetHudTimer = useCallback(() => {
    setIsHudHidden(false);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      if (useStudioStore.getState().presentationIsPlaying) {
        setIsHudHidden(true);
      }
    }, 2500);
  }, []);

  // Cleanup helper
  const stopCurrentPlayback = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // Render and play slide
  const playSlide = useCallback(
    (index: number, autoPlay = true) => {
      const targetSlide = slides[index];
      if (!targetSlide || !stageRef.current) return;

      stopCurrentPlayback();

      // Set slide markup
      stageRef.current.innerHTML = renderSlide(targetSlide, 0, 0);

      const slideDur = targetSlide.durationSeconds || 16.0;
      setTotalTimeStr(formatSeconds(slideDur));
      setCurrentTimeStr('00:00.0');

      // Video element handling
      const embeddedVid = stageRef.current.querySelector('video');
      if (embeddedVid) {
        const trimStart = parseFloat(embeddedVid.getAttribute('data-media-start') || '0');
        embeddedVid.currentTime = trimStart;
        embeddedVid.pause();
      }

      // Audio element handling
      if (targetSlide.voice?.audioUrl) {
        try {
          const audio = new Audio(targetSlide.voice.audioUrl);
          audio.currentTime = 0;
          audioRef.current = audio;
        } catch {
          // Audio constructor might fail in node/test env
        }
      }

      // Build GSAP timeline
      const tl = buildGsapTimelineForSlide(targetSlide, stageRef.current);
      timelineRef.current = tl;

      if (tl) {
        tl.eventCallback('onUpdate', () => {
          if (!timelineRef.current) return;
          const time = timelineRef.current.time();
          setCurrentTimeStr(formatSeconds(time));

          if (embeddedVid) {
            const trimStart = parseFloat(embeddedVid.getAttribute('data-media-start') || '0');
            const trimEnd = parseFloat(embeddedVid.getAttribute('data-media-end') || '9999');
            if (trimStart + time <= trimEnd) {
              if (Math.abs(embeddedVid.currentTime - (trimStart + time)) > 0.3) {
                embeddedVid.currentTime = trimStart + time;
              }
            }
          }
        });

        tl.eventCallback('onComplete', () => {
          setPresentationPlaying(false);
          if (embeddedVid) embeddedVid.pause();
          if (audioRef.current) audioRef.current.pause();

          // Auto-advance after 800ms
          const nextIdx = index + 1;
          if (nextIdx < slides.length) {
            autoAdvanceTimerRef.current = setTimeout(() => {
              if (useStudioStore.getState().isPresentationActive) {
                setPresentationIndex(nextIdx);
              }
            }, 800);
          }
        });
      }

      if (autoPlay) {
        setPresentationPlaying(true);
        if (tl) tl.restart();
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        if (embeddedVid) {
          embeddedVid.play().catch(() => {});
        }
      } else {
        setPresentationPlaying(false);
        if (tl) tl.progress(1);
      }
    },
    [slides, stageRef, stopCurrentPlayback, setPresentationPlaying, setPresentationIndex]
  );

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (!stageRef.current) return;
    const embeddedVid = stageRef.current.querySelector('video');

    if (presentationIsPlaying) {
      setPresentationPlaying(false);
      if (timelineRef.current) timelineRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      if (embeddedVid) embeddedVid.pause();
      setIsHudHidden(false);
    } else {
      setPresentationPlaying(true);
      if (timelineRef.current) {
        if (timelineRef.current.progress() >= 1) {
          timelineRef.current.restart();
        } else {
          timelineRef.current.play();
        }
      }
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      if (embeddedVid) {
        embeddedVid.play().catch(() => {});
      }
      resetHudTimer();
    }
  }, [presentationIsPlaying, setPresentationPlaying, stageRef, resetHudTimer]);

  const nextSlide = useCallback(() => {
    if (presentationIndex < slides.length - 1) {
      setPresentationIndex(presentationIndex + 1);
    }
  }, [presentationIndex, slides.length, setPresentationIndex]);

  const prevSlide = useCallback(() => {
    if (presentationIndex > 0) {
      setPresentationIndex(presentationIndex - 1);
    }
  }, [presentationIndex, setPresentationIndex]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      const el = containerRef.current || document.documentElement;
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [containerRef]);

  // Slide index change effect
  useEffect(() => {
    if (!isPresentationActive) return;
    playSlide(presentationIndex, true);
    resetHudTimer();

    return () => {
      stopCurrentPlayback();
    };
  }, [isPresentationActive, presentationIndex, playSlide, resetHudTimer, stopCurrentPlayback]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isPresentationActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePresentationMode();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationActive, closePresentationMode, togglePlayPause, nextSlide, prevSlide, toggleFullscreen]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isPresentationActive) {
      stopCurrentPlayback();
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isPresentationActive, stopCurrentPlayback]);

  return {
    isPresentationActive,
    presentationIndex,
    totalSlides: slides.length,
    presentationIsPlaying,
    currentTimeStr,
    totalTimeStr,
    isHudHidden,
    stageScale,
    resetHudTimer,
    togglePlayPause,
    nextSlide,
    prevSlide,
    toggleFullscreen,
    closePresentationMode,
  };
}
