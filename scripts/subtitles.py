"""
scripts/subtitles.py
Subtitle generator for AI Lecture Studio v2 (P7.1)
Converts per-slide narration and measured audio duration into valid,
monotonic, non-overlapping SRT and WebVTT subtitles with Vietnamese readability.
"""

import re
from typing import Any, Dict, List


def split_sentences_vietnamese(text: str, max_chars: int = 50) -> List[str]:
    """
    Split Vietnamese narration text into readable chunks for subtitles.
    1. Splits by sentence boundaries (. ! ? ; newline).
    2. Further splits long sentences by commas or natural word boundaries if > max_chars.
    """
    if not text:
        return []

    # Clean whitespace
    clean_text = " ".join(text.strip().split())
    if not clean_text:
        return []

    # Split into raw sentences
    raw_sentences = re.split(r"(?<=[.!?;\n])\s+", clean_text)
    chunks: List[str] = []

    for s in raw_sentences:
        s = s.strip()
        if not s:
            continue
        if len(s) <= max_chars:
            chunks.append(s)
        else:
            # Try splitting by comma
            sub_parts = re.split(r"(?<=,)\s+", s)
            current_chunk = ""
            for sp in sub_parts:
                sp = sp.strip()
                if not sp:
                    continue
                if not current_chunk:
                    current_chunk = sp
                elif len(current_chunk) + len(sp) + 1 <= max_chars:
                    current_chunk += " " + sp
                else:
                    chunks.append(current_chunk)
                    current_chunk = sp
            if current_chunk:
                # If a remaining chunk is still too long, split by words
                if len(current_chunk) > max_chars:
                    words = current_chunk.split()
                    w_chunk = ""
                    for w in words:
                        if not w_chunk:
                            w_chunk = w
                        elif len(w_chunk) + len(w) + 1 <= max_chars:
                            w_chunk += " " + w
                        else:
                            chunks.append(w_chunk)
                            w_chunk = w
                    if w_chunk:
                        chunks.append(w_chunk)
                else:
                    chunks.append(current_chunk)

    return chunks if chunks else [clean_text]


def _format_time(seconds: float, separator: str = ",") -> str:
    """Format seconds into HH:MM:SS,mmm or HH:MM:SS.mmm."""
    if seconds < 0:
        seconds = 0.0
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_seconds = total_ms // 1000
    s = total_seconds % 60
    total_minutes = total_seconds // 60
    m = total_minutes % 60
    h = total_minutes // 60
    return f"{h:02d}:{m:02d}:{s:02d}{separator}{ms:03d}"


def generate_subtitles(scene_data: Dict[str, Any], format_type: str = "srt") -> str:
    """
    Generate SRT or VTT subtitles from scene data.
    Ensures:
    - Monotonic timing (start < end).
    - No overlapping cues.
    - Proportional timing based on phrase length.
    - Correct UTF-8 Vietnamese diacritics.
    """
    is_vtt = format_type.lower() == "vtt"
    separator = "." if is_vtt else ","

    slides = scene_data.get("slides", [])
    cue_items = []
    global_time = 0.0

    for slide in slides:
        slide_duration = float(slide.get("durationSeconds") or 4.0)
        voice_info = slide.get("voice", {}) or {}
        narration = voice_info.get("narration") or slide.get("narrationScript") or ""

        # Determine speech duration within slide (default to audio duration or slide_duration - 0.5s)
        audio_dur = voice_info.get("durationSeconds")
        if audio_dur is not None and float(audio_dur) > 0:
            speech_duration = min(float(audio_dur), slide_duration)
        else:
            speech_duration = max(slide_duration - 0.5, 1.0)

        chunks = split_sentences_vietnamese(narration)
        if chunks:
            total_chars = sum(len(c) for c in chunks)
            # Offset start slightly (0.1s) after slide begins for natural breathing room
            slide_speech_start = global_time + 0.1
            slide_speech_end = global_time + speech_duration
            avail_speech_time = max(slide_speech_end - slide_speech_start, 0.5)

            curr_cue_start = slide_speech_start
            for idx, chunk in enumerate(chunks):
                if total_chars > 0:
                    cue_dur = (len(chunk) / total_chars) * avail_speech_time
                else:
                    cue_dur = avail_speech_time / len(chunks)

                # Minimum cue duration 0.6s for readability
                cue_dur = max(cue_dur, 0.6)

                cue_end = curr_cue_start + cue_dur
                # Ensure last cue ends near speech end and does not exceed slide end
                if idx == len(chunks) - 1:
                    cue_end = min(max(cue_end, slide_speech_end), global_time + slide_duration - 0.05)
                else:
                    cue_end = min(cue_end, global_time + slide_duration - 0.05)

                if cue_end <= curr_cue_start:
                    cue_end = curr_cue_start + 0.5

                cue_items.append({
                    "start": curr_cue_start,
                    "end": cue_end,
                    "text": chunk
                })
                # Prevent overlap
                curr_cue_start = cue_end

        # Advance global time to next slide
        global_time += slide_duration

    # Render formatted string
    lines: List[str] = []
    if is_vtt:
        lines.append("WEBVTT")
        lines.append("")

    for idx, cue in enumerate(cue_items, start=1):
        start_str = _format_time(cue["start"], separator)
        end_str = _format_time(cue["end"], separator)

        if not is_vtt:
            lines.append(str(idx))
        lines.append(f"{start_str} --> {end_str}")
        lines.append(cue["text"])
        lines.append("")

    return "\n".join(lines).strip() + "\n"
