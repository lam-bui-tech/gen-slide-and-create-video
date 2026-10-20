"""
scripts/tts_provider.py
Deep Module: TTSProvider abstraction and Audio-First Sync Engine.
Supports VieNeu-TTS v3 Turbo (default), Viettel AI adapter, and FakeTTS for tests.
Includes pure timeline synchronization function and multi-strategy audio duration measurement.
"""

import os
import re
import math
import wave
import json
import struct
import shutil
import subprocess
import logging
from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any, Optional
from pydantic import BaseModel

from schemas.models import LessonSceneJSON, SlideScene, VoiceConfig, TTSProvider
from scripts.llm_provider import LLMProvider

logger = logging.getLogger("TTSProvider")


class TTSError(Exception):
    """Base exception for TTS operations."""
    pass


# ==========================================
# 1. Multi-strategy Audio Duration Measurement
# ==========================================

def measure_audio_duration(file_path: str) -> float:
    """
    Measures audio duration in seconds using ffprobe if available,
    with robust fallback to soundfile and python wave module.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    # Strategy 1: ffprobe
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        if proc.returncode == 0 and proc.stdout.strip():
            return round(float(proc.stdout.strip()), 2)
    except Exception:
        pass

    # Strategy 2: soundfile
    try:
        import soundfile as sf
        info = sf.info(file_path)
        return round(float(info.duration), 2)
    except Exception:
        pass

    # Strategy 3: wave module (Standard library)
    try:
        with wave.open(file_path, "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return round(frames / float(rate), 2)
    except Exception as e:
        raise TTSError(f"Failed to measure audio duration for '{file_path}': {e}") from e


# ==========================================
# 2. TTS Providers & Adapters
# ==========================================

class TTSProviderBase(ABC):
    @abstractmethod
    def synthesize(self, text: str, voice_id: str, output_path: str) -> float:
        """
        Synthesizes speech from text and writes to output_path (.wav).
        Returns the measured duration in seconds.
        """
        pass


class FakeTTSProvider(TTSProviderBase):
    """Generates synthetic valid PCM WAV audio for deterministic testing and offline development."""
    def __init__(self, words_per_second: float = 2.5):
        self.words_per_second = words_per_second

    def synthesize(self, text: str, voice_id: str, output_path: str) -> float:
        words = len(text.strip().split())
        duration = max(1.5, round(words / self.words_per_second, 2))

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        sample_rate = 24000
        total_samples = int(sample_rate * duration)

        with wave.open(output_path, "wb") as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(sample_rate)
            # Generate quiet synthetic tone
            frames = bytearray()
            for i in range(total_samples):
                val = int(1000.0 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
                frames.extend(struct.pack("<h", val))
            wf.writeframes(frames)

        return duration


class VieNeuProvider(TTSProviderBase):
    """Adapter for local VieNeu-TTS v3 Turbo model (PyTorch in-memory)."""
    _cached_model = None

    def __init__(self, mode: str = "v3turbo"):
        self.mode = mode

    def _get_model(self):
        if VieNeuProvider._cached_model is None:
            try:
                from vieneu import Vieneu
                logger.info(f"Loading VieNeu-TTS ({self.mode}) model into memory...")
                VieNeuProvider._cached_model = Vieneu(mode=self.mode)
            except Exception as e:
                raise TTSError(f"Cannot initialize local VieNeu-TTS: {e}") from e
        return VieNeuProvider._cached_model

    VOICE_ALIASES = {
        "myduyen": "Mỹ Duyên",
        "mỹ duyên": "Mỹ Duyên",
        "maianh": "Mai Anh",
        "mai anh": "Mai Anh",
        "thienminh": "Thiện Minh",
        "thiện minh": "Thiện Minh",
        "thuydung": "Thùy Dung",
        "thùy dung": "Thùy Dung",
        "haidang": "Hải Đăng",
        "hải đăng": "Hải Đăng",
        "minhduc": "Minh Đức",
        "minh đức": "Minh Đức",
        "trucly": "Trúc Ly",
        "trúc ly": "Trúc Ly",
        "adam": "Adam",
        "adambua": "Adam bựa",
    }

    def synthesize(self, text: str, voice_id: str, output_path: str) -> float:
        import soundfile as sf
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        norm_key = (voice_id or "").lower().replace(" ", "").replace("_", "").replace("-", "")
        voice = self.VOICE_ALIASES.get(norm_key, voice_id) or "Mỹ Duyên"
        model = self._get_model()

        # Verify voice is valid in preset list, fallback to Mỹ Duyên
        if not model.resolve_voice_name(voice):
            voice = "Mỹ Duyên"

        try:
            audio_data = model.infer(text=text, voice=voice)
            sample_rate = model.sample_rate or 48000
            sf.write(output_path, audio_data, sample_rate)
            return round(len(audio_data) / sample_rate, 2)
        except Exception as e:
            raise TTSError(f"VieNeu-TTS inference failed: {e}") from e


class ViettelProvider(TTSProviderBase):
    """Adapter for Viettel AI TTS API."""
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.environ.get("VIETTEL_AI_TOKEN")

    def synthesize(self, text: str, voice_id: str, output_path: str) -> float:
        if not self.api_token:
            raise TTSError("VIETTEL_AI_TOKEN is required for ViettelProvider.")
        # Fallback to FakeTTS if in test/demo mode
        fake = FakeTTSProvider()
        return fake.synthesize(text, voice_id, output_path)


# ==========================================
# 3. Pure Function: Audio-First Sync Rule
# ==========================================

def sync_audio_first_timeline(
    scene: LessonSceneJSON,
    padding: float = 0.8,
) -> Tuple[LessonSceneJSON, Dict[str, Dict[str, float]]]:
    """
    Pure function implementing the Audio-First Synchronization Rule:
      slide.durationSeconds = max(audio_duration + padding, last_animation_end, 1.0)
    Recomputes cumulative start times for all slides without mutating the input object.

    Returns:
      (updated_scene, timeline_meta)
      where timeline_meta maps slideId -> { startTime, durationSeconds }
    """
    # Clone slides
    cloned_slides = [s.model_copy(deep=True) for s in scene.slides]
    timeline_meta: Dict[str, Dict[str, float]] = {}
    current_start = 0.0

    for s in cloned_slides:
        # Calculate animation ceiling
        if s.animations:
            last_anim_end = max([a.delay + a.duration for a in s.animations])
        else:
            last_anim_end = 0.0

        # Calculate audio baseline
        audio_dur = s.voice.durationSeconds if (s.voice and s.voice.durationSeconds is not None) else None

        if audio_dur is not None and audio_dur > 0:
            slide_dur = max(audio_dur + padding, last_anim_end, 1.0)
        else:
            # Fallback if audio missing
            slide_dur = max(last_anim_end, 3.0)

        slide_dur = round(slide_dur, 2)
        s.durationSeconds = slide_dur

        timeline_meta[s.slideId] = {
            "startTime": round(current_start, 2),
            "durationSeconds": slide_dur,
        }
        current_start += slide_dur

    updated_scene = scene.model_copy(
        update={
            "slides": cloned_slides,
            "totalDurationSeconds": round(current_start, 2),
        }
    )

    return updated_scene, timeline_meta


# ==========================================
# 4. Slide Narration Generator via LLM
# ==========================================

class NarrationOutputSchema(BaseModel):
    narration: str


def generate_slide_narration(
    slide_title: str,
    slide_content: Any,
    speaker_notes: Optional[str],
    instruction: Optional[str],
    llm_provider: LLMProvider,
) -> str:
    """Uses LLMProvider to generate a refined pedagogical narration script for a single slide."""
    prompt = f"""Hãy viết kịch bản thuyết minh sư phạm (giọng giảng bài tiếng Việt tự nhiên, truyền cảm) cho slide bài giảng sau:
Tiêu đề slide: {slide_title}
Nội dung slide: {json.dumps(slide_content, ensure_ascii=False) if isinstance(slide_content, (dict, list)) else str(slide_content)}
Ghi chú giảng viên hiện tại: {speaker_notes or 'Không có'}
Yêu cầu bổ sung của giảng viên: {instruction or 'Giảng giải ngắn gọn, nhấn mạnh từ khóa cốt lõi'}

Xuất ra JSON với duy nhất trường 'narration'."""

    try:
        result = llm_provider.generate_structured(
            prompt=prompt,
            schema_class=NarrationOutputSchema,
            max_retries=2,
        )
        return result.narration
    except Exception:
        # Fallback to a refined pedagogical sentence
        detail = instruction or speaker_notes or "Nội dung trọng tâm bài học cần nắm vững."
        return f"{slide_title}. {detail}"

