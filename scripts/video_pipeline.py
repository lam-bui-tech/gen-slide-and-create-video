"""
scripts/video_pipeline.py
Video processing utilities for AI Lecture Studio v2 (P6.2)
Handles FFprobe video inspection (duration, codec, audio presence)
and FFmpeg poster frame extraction for static formats (PDF/PPTX).
"""

import json
import logging
import os
import subprocess
from typing import Any, Dict

logger = logging.getLogger("VideoPipeline")


def probe_video(video_path: str) -> Dict[str, Any]:
    """
    Inspects video file using ffprobe and extracts metadata.
    Returns:
      {
        "durationSeconds": float,
        "hasAudio": bool,
        "codec": str,
        "width": int,
        "height": int
      }
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path,
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if res.returncode != 0:
            logger.warning(f"ffprobe failed: {res.stderr}")
            return {"durationSeconds": 5.0, "hasAudio": False, "codec": "unknown"}

        data = json.loads(res.stdout)
        format_info = data.get("format", {})
        streams = data.get("streams", [])

        duration = float(format_info.get("duration", 5.0))
        has_audio = any(s.get("codec_type") == "audio" for s in streams)
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})

        codec = video_stream.get("codec_name", "h264")
        width = int(video_stream.get("width", 1280))
        height = int(video_stream.get("height", 720))

        return {
            "durationSeconds": round(duration, 2),
            "hasAudio": has_audio,
            "codec": codec,
            "width": width,
            "height": height,
        }
    except Exception as e:
        logger.error(f"Failed to probe video {video_path}: {e}")
        return {"durationSeconds": 5.0, "hasAudio": False, "codec": "unknown"}


def extract_poster_frame(video_path: str, poster_path: str, timestamp_sec: float = 1.0) -> bool:
    """
    Extracts a crisp poster frame from video at timestamp using FFmpeg.
    """
    if not os.path.exists(video_path):
        return False

    os.makedirs(os.path.dirname(poster_path), exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-ss", str(timestamp_sec),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        poster_path,
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if res.returncode == 0 and os.path.exists(poster_path) and os.path.getsize(poster_path) > 0:
            return True
        logger.warning(f"FFmpeg poster extraction failed: {res.stderr}")
        return False
    except Exception as e:
        logger.error(f"Failed to extract poster frame from {video_path}: {e}")
        return False
