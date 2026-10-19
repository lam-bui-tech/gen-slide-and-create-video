# 04: [A] VieNeu-TTS Voice Synthesis & Audio-First Dynamic Sync Engine

**What to build:**
Tích hợp động cơ tổng hợp giọng đọc tiếng Việt chất lượng cao VieNeu-TTS v3 Turbo (`pnnbao-ump/VieNeu-TTS-v3-Turbo`) chạy thường trú trong dịch vụ FastAPI để sinh giọng nói tức thì cho từng slide bài giảng. Cài đặt thuật toán thuần khiết (pure function) **Audio-First Sync**: đo chính xác độ dài file âm thanh (`ffprobe`), tự động thiết lập thời lượng slide `durationSeconds = max(audioDuration + 0.8, lastAnimationEnd)`, và tự động tính toán lại thời điểm bắt đầu (`data-start`) tích lũy cho toàn bộ các slide phía sau. Khi giảng viên sửa lời đọc, hệ thống chỉ chạy lại TTS cho slide đó và co giãn timeline tự động.

**Blocked by:** None (có thể bắt đầu ngay và kiểm thử với `fixtures/scene.sample.json`).

**Status:** ready-for-agent

- [ ] Định nghĩa `TTSProvider` interface (`synthesize(text, voice_id) -> (audio_bytes, duration)`) với `VieNeuProvider`, `ViettelProvider`, và `FakeTTSProvider`.
- [ ] Xây dựng module tính toán Audio-First Sync (`compute_timeline_sync(scene_json)`) với bộ unit test toàn diện (audio ngắn hơn animation, audio dài hơn, audio bằng, thiếu audio, bài giảng 1 slide).
- [ ] Đo thời lượng file audio bằng `ffprobe` / soundfile và lưu tệp `.wav` vào `storage/projects/{id}/audio/`.
- [ ] Cung cấp endpoint `POST /projects/{id}/slides/{sid}/narration` (sinh lại lời thoại) và `POST /projects/{id}/slides/{sid}/audio` (tạo lại audio và cập nhật timeline) theo `docs/API.md`.
