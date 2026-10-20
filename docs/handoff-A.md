# Handoff Track A — Backend & Pipeline v2 (Người A)

## 1. Đã hoàn thành (Done - 100% Person A Tickets)
- **P1.1**: Sửa lỗi 404 static images (`/storage/projects/{id}/images/` & `videos/`), xóa 3 phantom fallback trong `outline_to_hyperframes.js`.
- **P1.2**: Schema v2 (`template_pack.json`, `lesson_scene.json` v2, Pydantic & TS models, `tests/test_contracts.py` drift guard).
- **P1.3**: `migrate_v1_to_v2.py` (idempotent, lossless, migrate-on-read, CLI backup, golden fixtures cho 10 layout).
- **P2.2**: API Packs (`GET /packs` đa chiều, `GET /packs/{id}`, `POST /packs`, `POST /projects` gắn `packId`).
- **P3.1**: `AdaptiveClarificationService` (suy diễn thông minh từ doc/pack tokens, bỏ qua nếu confidence >= 0.8, tối đa 2 câu hỏi).
- **P3.2**: `SlotFillerEngine` (bóc tách image inventory, chống sinh ảnh ảo, ràng buộc slot + auto-retry, trả slide plan).
- **P4.1 & P4.2**: `MediaRecommender` (phân tích `visual_need`, 3 adapters: DocumentImage, Diagram SVG, Upload).
- **P5.3**: API lưu Layout từ Builder (`POST /packs/{id}/layouts`, chặn sửa pack basic, tạo thumbnail).
- **P6.1 & P6.2**: Video Pipeline (spike ADR-0008, upload MP4/WebM, ffprobe + trích xuất poster frame, sync audio-first max(narration, video)).
- **P7.1**: Phụ đề SRT/VTT (`GET /projects/{id}/subtitles.srt|vtt`, tách câu tiếng Việt đơn điệu, không đè lấp).
- **P7.2**: Chuẩn hóa phát âm tiếng Việt (`scripts/pronunciation.py`, toán học $x^2, \sqrt{x}$, từ điển chuyên ngành).
- **P7.3-API**: Endpoint chat sửa slide (`POST /projects/{id}/slides/{slideId}/chat`, patch slotValues, không can thiệp HTML).

## 2. File thay đổi & tạo mới (Changed / Created Files)
- **Schemas**: `schemas/template_pack.json`, `schemas/lesson_scene.json`, `schemas/models.py`, `schemas/types.ts`.
- **Server**: `server/api_service.py`, `server.js`.
- **Scripts**: `scripts/pack_loader.py`, `scripts/migrate_v1_to_v2.py`, `scripts/adaptive_clarification.py`, `scripts/slot_filler.py`, `scripts/media_recommender.py`, `scripts/video_pipeline.py`, `scripts/subtitles.py`, `scripts/pronunciation.py`, `scripts/export_service.py`, `scripts/tts_provider.py`.
- **Fixtures & Packs**: `templates/packs/basic/pack.json`, `fixtures/basic_pack.sample.json`, `fixtures/migration/*`.
- **ADRs & Docs**: `docs/adr/0006*.md`, `docs/adr/0007*.md`, `docs/adr/0008*.md`, `docs/spikes/P6.1.md`, `docs/API.md`, `docs/TICKETS.md`.
- **Tests**: `tests/pipeline/*`, `tests/test_contracts.py` (96/96 tests PASS).

## 3. Quyết định kỹ thuật & Giao diện (Key Decisions & Contracts)
- **JSON Schema Strictness**: Luôn dùng `exclude_none=True` khi export Pydantic sang JSON Schema draft-07.
- **Audio-First Sync với Video**: Slide duration = `max(audio_duration + padding, video_duration, last_anim_end, 3.0)`.
- **Slide Chat Boundary**: Trả patch trên `slotValues` + diff, tuyệt đối không sinh trực tiếp HTML, không tự động lưu đè trước PUT.
- **Chính sách pack basic**: Built-in `basic` là read-only (403 khi ghi đè); chỉnh sửa sẽ copy-on-write sang pack mới.

## 4. Lệnh kiểm thử & khôi phục phiên (Run Tests & Resume)
```bash
# Set UTF-8 trên Windows
$env:PYTHONUTF8="1"
# Chạy toàn bộ 96 tests (pipeline + contracts)
python -m pytest tests/pipeline tests/test_contracts.py
```

## 5. Bàn giao cho Người B (Next Steps for Person B)
- **P1.4 & P1.5**: Nạp `templates/packs/basic/pack.json` và hoàn thiện JS `TemplateRegistry`.
- **P2.1 & P2.3**: Dựng Template Gallery kết nối API `GET /packs` và `POST /projects` (`packId`).
- **P3.3**: Kết nối Studio với `GET /projects/{id}/clarify` và `POST /projects/{id}/scene`.
- **P4.3**: Dựng Media Strip UI gọi `GET /projects/{id}/media-recommendations/{slideId}`.
- **P5.1 & P5.2**: Template Builder gọi `POST /packs/{id}/layouts`.
- **P6.3**: Video component trên Canvas kết nối poster và video URL từ API media-upload.
- **P7.3 & P7.4**: Tích hợp chat box sửa slide vào `POST /projects/{id}/slides/{slideId}/chat`.
