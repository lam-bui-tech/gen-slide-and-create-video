# Handoff Track A — Pipeline & Backend (Người A)

## 1. Đã hoàn thành (Done)
- **A1 (Document Ingestion Service)**:
  - `scripts/document_ingestion.py`: Bóc tách PPTX, PDF, DOCX, MD thành `DocumentContext.json` hợp lệ schema.
  - Bóc tách ảnh nhúng lưu vào `storage/` với ID ổn định (`img_{hash}_{idx}`), ném lỗi kiểu dữ liệu rõ ràng.
- **A2 (Clarification Flow & LLM Provider)**:
  - `scripts/llm_provider.py`: Deep Module interface `LLMProvider` có vòng lặp auto-retry feedback (tối đa 3 lần).
  - Adapters: `GeminiProvider` (Gemini 3.7 Flash), `OllamaProvider` (Llama 3.3/Qwen), `FakeProvider` (testing).
  - `scripts/clarification_service.py`: 8 câu hỏi sư phạm, pre-fill thông minh từ `DocumentContext`.
- **A3 (Outline Generator & Gating API)**:
  - `scripts/outline_generator.py`: Sinh `LessonOutline` gồm 10 template sư phạm chuẩn, `speakerNotesDraft` tiếng Việt.
  - API duyệt dàn bài (`PUT /projects/{id}/outline`). Khóa `POST /projects/{id}/scene` (422) nếu chưa `approved`.
- **A4 (VieNeu-TTS & Audio-First Sync Engine)**:
  - `scripts/tts_provider.py`: `VieNeuProvider` (mặc định), `ViettelProvider`, `FakeTTSProvider`.
  - Đo thời lượng âm thanh đa tầng (`ffprobe` -> `soundfile` -> `wave`).
  - Hàm thuần `sync_audio_first_timeline`: `slide.durationSeconds = max(audio + 0.8s, anim, 1s)`, tịnh tiến timeline.
- **A5 (Multi-Format Export Pipeline)**:
  - `scripts/export_service.py`: Quản lý background jobs (`pending`, `running`, `completed`, `failed`) trong SQLite.
  - **MP4 1080p**: Subprocess gọi `npx hyperframes render` có timeout, bắt log tiến độ, cleanup file hỏng.
  - **PDF Vector**: Headless Chrome in trang 16:9 (@page `1920px 1080px`), nhúng font Be Vietnam Pro, số trang = số slide.
  - **PPTX Image-Pack**: 1 slide gồm ảnh 1080p + speaker notes tiếng Việt, ghi chú rõ ràng không thể biên tập.

## 2. File thay đổi (Changed Files)
- `scripts/document_ingestion.py`, `scripts/clarification_service.py`, `scripts/llm_provider.py`
- `scripts/outline_generator.py`, `scripts/tts_provider.py`, `scripts/export_service.py`, `scripts/spike_vietnamese_diacritics.py`
- `server/api_service.py` (FastAPI endpoints theo `docs/API.md`)
- `fixtures/sample.docx`, `fixtures/sample.md`, `fixtures/sample.pdf`
- `tests/pipeline/` (9 file kiểm thử, bao phủ 100% các module pipeline)
- `docs/handoff-A.md`

## 3. Quyết định kỹ thuật (ADRs)
- Kiến trúc Dual Service: FastAPI cổng `8000` (xử lý Ingestion, AI, TTS, Export) + Node/Studio cổng `3000`.
- SQLite (`storage/lecture_studio.db`) lưu metadata và tiến trình jobs; file system lưu ngữ cảnh JSON và tài nguyên.
- Auto-retry feedback loop cho LLM: Tự động đưa thông báo lỗi Pydantic/JSON Schema ngược lại prompt nếu LLM sinh sai.
- Timeline Audio-First thuần khiết: Slide duration được dẫn dắt bởi độ dài thực tế của giọng đọc âm thanh.

## 4. Lệnh kiểm thử (Run Tests)
```bash
# Kiểm thử toàn bộ 39 unit & integration tests của Track A
python -m pytest tests/pipeline/ -v
# Kết quả: 39/39 tests PASS
```

## 5. Việc kế tiếp (Next Steps)
- Phối hợp với Người B chạy **Integration Gate G2**: Nạp outline thật từ A3 vào `outline_to_hyperframes.js`.
- Chạy **Integration Gate G3 & G4**: Đổi Studio (B3 & B5) từ mock sang gọi REST API FastAPI cổng 8000 thật.
- Kiểm thử luồng xuất video **Integration Gate G5**: Xuất file MP4 1080p từ scene do Studio cập nhật.
