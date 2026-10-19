# Handoff Track B — Engine & Studio (Người B)

## 1. Đã hoàn thành (Done)
- **B1 (Tokens & 10 Templates)**:
  - `templates/tokens.css`: Hệ token 3 tầng chuẩn WCAG AA, bảng màu Academic Ocean & Amber, font Be Vietnam Pro, lưới 1920x1080.
  - `templates/templates.css`: Layout & style cho 10 template sư phạm và 6 layout variant.
  - `templates/index.js`: Template registry, pure renderers (`renderSlide`), GSAP timeline builder.
  - `tests/engine/snapshots/all_templates_preview.html`: Snapshot render tiếng Việt có dấu.
- **B2 (Mapper)**:
  - `outline_to_hyperframes.js`: 2 bước thuần khiết (`outlineToScene`, `sceneToHyperFramesHtml`), tính timeline tịnh tiến dựa trên `durationSeconds` (audio-first sync), ném lỗi `SchemaValidationError` khi dữ liệu sai schema.
- **B3 (Studio Direct Editing)**:
  - `studio/reducer.js`: Quản lý state bất biến, kiểm định schema, hàm `computeSlideDuration`.
  - `studio/index.html` & `studio.html`: Canvas 1920x1080 tự co giãn, click sửa chữ trực tiếp (`contenteditable`), modal chọn/tải ảnh, Undo/Redo (`Ctrl+Z`, `Ctrl+Y`), autosave debounce 500ms.
- **B4 (Layout Variants & Animation Presets)**:
  - Bộ chuyển đổi variant: `default`, `text-left-image-right`, `text-right-image-left`, `stacked-top`, `fullscreen`, `no-image`.
  - Bộ chọn hiệu ứng GSAP: `fade-in`, `slide-in`, `zoom-in`, `typewriter`, `step-by-step`, `highlight-keyword`.
  - Scrubber timeline từng slide (Play, Pause, Stop, tua thời gian).
- **B5 (Voice UI & Audio-First Sync)**:
  - Trình soạn thảo kịch bản lời thoại, đếm từ/ký tự, tính thời lượng ước tính.
  - Nút "Tạo lại giọng đọc", player audio, tự động co giãn `durationSeconds = max(audio + 1s, anim, 3s)`.
  - Khóa nút xuất video (MP4/PDF/PPTX) khi đang chạy tiến trình TTS.

## 2. File thay đổi (Changed Files)
- `templates/tokens.css`, `templates/templates.css`, `templates/index.js`
- `outline_to_hyperframes.js`
- `studio/reducer.js`, `studio/index.html`, `studio.html`
- `tests/engine/test_engine.py`, `tests/engine/test_mapper.py`, `tests/engine/test_templates_snapshot.py`, `tests/engine/test_studio_reducer.py`
- `docs/handoff-B.md`

## 3. Quyết định kỹ thuật (ADRs)
- Dùng `studio/reducer.js` thuần khiết để tách rời logic cập nhật và kiểm định schema khỏi DOM.
- Canvas render thông qua `templates/index.js` đảm bảo WYSIWYG đồng nhất 100% với video MP4 render từ HyperFrames CLI.
- Slide duration luôn tuân thủ nguyên tắc Audio-First: âm thanh thật từ Người A quyết định thời lượng hiển thị.

## 4. Lệnh kiểm thử (Run Tests)
```bash
python3 -m unittest discover -s tests/engine -p "test_*.py"
# Kết quả: 27/27 tests PASS
```

## 5. Việc kế tiếp (Next Steps)
- Chờ Người A hoàn thành A3 và A4 để test Integration Gate G2 và G3.
- Kết nối Studio trực tiếp vào backend `server.js` khi Person A hoàn tất các API routes.
