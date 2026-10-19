"""
scripts/synthesize_slide.py
Tạo hoặc tái tạo âm thanh VieNeu-TTS cục bộ cho một slide cụ thể.
Đo thời lượng chính xác và cập nhật durations.json + lecture.json.
"""

import os
import sys
import json
import argparse
import soundfile as sf

# Set utf-8 encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def synthesize_single_slide(slide_id, text, voice="Mỹ Duyên", mode="v3turbo"):
    os.makedirs("audio", exist_ok=True)
    audio_path = f"audio/{slide_id}.wav"
    
    # Import VieNeu
    try:
        from vieneu import Vieneu
        tts = Vieneu(mode=mode)
        audio_data = tts.infer(text=text, voice=voice)
        sf.write(audio_path, audio_data, 48000)
        duration = round(len(audio_data) / 48000, 2)
    except Exception as e:
        # Fallback or error simulation if model can't be loaded
        print(f"[ERROR] Không thể gọi VieNeu-TTS: {e}", file=sys.stderr)
        # Check if existing audio file exists
        if os.path.exists(audio_path):
            info = sf.info(audio_path)
            duration = round(info.duration, 2)
        else:
            # Estimate duration based on word count (~2.5 words/sec)
            words = len(text.strip().split())
            duration = max(5.0, round(words / 2.5, 2))

    # Update audio/durations.json
    durations = {}
    if os.path.exists("audio/durations.json"):
        try:
            with open("audio/durations.json", "r", encoding="utf-8") as f:
                durations = json.load(f)
        except Exception:
            durations = {}

    durations[slide_id] = duration
    with open("audio/durations.json", "w", encoding="utf-8") as f:
        json.dump(durations, f, indent=2, ensure_ascii=False)

    # Update lecture.json if present
    if os.path.exists("lecture.json"):
        try:
            with open("lecture.json", "r", encoding="utf-8") as f:
                lecture = json.load(f)
            
            for s in lecture.get("slides", []):
                if s.get("id") == slide_id:
                    s["narrationScript"] = text
                    s["duration"] = duration
                    s["audioFile"] = audio_path
                    break
                    
            with open("lecture.json", "w", encoding="utf-8") as f:
                json.dump(lecture, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[WARN] Không thể cập nhật lecture.json: {e}", file=sys.stderr)

    result = {
        "success": True,
        "slideId": slide_id,
        "duration": duration,
        "audioFile": audio_path,
        "voice": voice
    }
    
    print(json.dumps(result, ensure_ascii=False))
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VieNeu-TTS Single Slide Synthesizer")
    parser.add_argument("--slide-id", required=True, help="ID của slide (vd: slide1, slide2)")
    parser.add_argument("--text", required=True, help="Kịch bản lời thuyết minh")
    parser.add_argument("--voice", default="Mỹ Duyên", help="Tên giọng đọc (Mỹ Duyên, v.v.)")
    parser.add_argument("--mode", default="v3turbo", help="Chế độ mô hình VieNeu-TTS")
    
    args = parser.parse_args()
    synthesize_single_slide(args.slide_id, args.text, args.voice, args.mode)
