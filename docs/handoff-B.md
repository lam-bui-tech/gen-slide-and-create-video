# Handoff Track B — Engine & Studio (Người B) — Sprint v2 Complete

## 1. Tổng Quan Tiến Độ (100% Hoàn Thành Tất Cả Ticket Track B)
Nhánh: `developerB`
Toàn bộ các ticket Person B từ P1 đến P7 theo hợp đồng `docs/TICKETS.md` và `person-B-engine-studio-v2.md` đã hoàn thành và được kiểm thử tự động toàn diện:

- **P1.4 (Template Pack Basic)**:
  - Đóng gói 10 layout sư phạm hiện tại vào [templates/packs/basic/pack.json](file:///c:/Users/OS/Downloads/project/my-presentation/templates/packs/basic/pack.json) chuẩn theo JSON schema `schemas/template_pack.json`.
  - Giữ nguyên vẹn 100% snapshot pixel-identical của 10 layout ([tests/engine/test_templates_snapshot.py](file:///c:/Users/OS/Downloads/project/my-presentation/tests/engine/test_templates_snapshot.py)).
- **P1.5 (TemplateRegistry & Migration)**:
  - Xây dựng [templates/registry.js](file:///c:/Users/OS/Downloads/project/my-presentation/templates/registry.js) và [templates/migration.js](file:///c:/Users/OS/Downloads/project/my-presentation/templates/migration.js).
  - Tự động nạp pack từ filesystem, validate slots/decor/variants/animations. Tự động nâng cấp cảnh v1 sang v2 (`migrateOnRead`).
- **P2.1 & P2.3 (Template Gallery & Flow Machine)**:
  - Xây dựng Prototype Gallery tại [docs/prototypes/gallery.html](file:///c:/Users/OS/Downloads/project/my-presentation/docs/prototypes/gallery.html).
  - Tích hợp State Machine [studio/flow.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/flow.js) và Modal Gallery vào [studio.html](file:///c:/Users/OS/Downloads/project/my-presentation/studio.html) làm Bước 1 trước khi tải file, hỗ trợ đổi bộ mẫu tức thời (`SWITCH_TEMPLATE_PACK`).
- **P3.3 (Outline Review & Slot Filler UI)**:
  - Xây dựng [studio/outline_editor.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/outline_editor.js) và Modal Duyệt Dàn Bài trước khi sinh slide.
  - Hỗ trợ sửa tiêu đề, đổi layout, thêm/xóa/đổi thứ tự slide dàn bài. Xử lý an toàn slot rỗng (`formatSlotText`).
- **P4.3 (Media Strip UI & 1-Chạm Gợi Ý)**:
  - Tích hợp Media Strip trong Properties Panel của [studio.html](file:///c:/Users/OS/Downloads/project/my-presentation/studio.html), hiển thị nhãn nhu cầu thị giác `visualNeed` và 3-4 ứng viên gợi ý thông minh từ Person A (`GET /projects/{id}/media-recommendations/{slideId}`).
  - Hỗ trợ đổi ảnh 1-chạm hoặc tự động fallback sang biến thể `no-image` khi xóa ảnh (`SET_MEDIA_SLOT`, `REMOVE_MEDIA_SLOT`).
- **P5.1 & P5.2 (Template Builder Engine & Inspector)**:
  - Xây dựng [studio/builder.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/builder.js): canvas kéo thả khối 1920x1080, snap-to-grid 8px chuẩn, thêm/sửa/xóa block (text, card, image, badge, decor, video).
  - Bảng Inspector gắn vai trò dữ liệu (Slot Role vs Decor tĩnh), thiết lập giới hạn ký tự `maxChars`, bắt buộc `required`, gán preset hoạt họa GSAP (`fade-in`, `slide-in`, `zoom-in`, `typewriter`, `step-by-step`).
  - Xác thực Layout JSON trước khi lưu và xuất sang pack mới.
- **P6.1 & P6.3 (Video Component trên Canvas & Timeline Sync)**:
  - Spike P6.1: Xác lập hợp đồng thuộc tính HyperFrames `<video>` tại [docs/spikes/P6.1.md](file:///c:/Users/OS/Downloads/project/my-presentation/docs/spikes/P6.1.md).
  - P6.3: Render video chuẩn HyperFrames (`data-start`, `data-duration`, `data-media-start`, `data-volume`, `data-ducking`, `data-has-audio="true"`, `class="clip"`).
  - Inspector điều khiển Video: chỉnh `trimStart`, `trimEnd`, slider âm lượng (`volume`), checkbox `ducking` (tự giảm âm lượng xuống 0.2 khi có narration).
  - Đồng bộ hoá scrubber timeline Studio với `currentTime` của thẻ `<video>` trên canvas.
- **P7.3 (Per-Slide AI Chat Copilot)**:
  - Ô chat AI sửa từng slide tại [studio.html](file:///c:/Users/OS/Downloads/project/my-presentation/studio.html), kết nối trực tiếp `POST /projects/{id}/slides/{slideId}/chat`.
  - Hiển thị bảng so sánh Diff trực quan (Trước / Sau), người dùng xem trước và nhấn **Áp Dụng (Apply)** hoặc **Hủy Bỏ (Discard)**.
  - Action `APPLY_SLIDE_CHAT_PATCH` trong [studio/reducer.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/reducer.js) chỉ vá các `slotValues`, lọc bỏ toàn bộ mã độc HTML thô, hỗ trợ Undo/Redo hoàn hảo.
- **P7.4 (Pedagogical Quality Review Panel)**:
  - Module pure function [studio/quality.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/quality.js) kiểm tra toàn diện chất lượng sư phạm:
    1. Mật độ chữ (`TEXT_DENSITY_HIGH`: > 350 ký tự / > 55 từ).
    2. Tốc độ đọc narration (`READING_SPEED_FAST` > 4.5 từ/s; `READING_SPEED_SLOW` < 1.5 từ/s).
    3. Thời lượng slide cực đoan (`SLIDE_TOO_SHORT` < 3.0s; `SLIDE_TOO_LONG` > 90.0s).
    4. Trợ năng hình ảnh (`MISSING_ALT_TEXT`).
    5. Slide trống (`SLIDE_EMPTY`).
  - Bảng điều khiển Modal trong Studio hiển thị điểm số sư phạm (0 - 100), phân loại mức độ (Lỗi / Cảnh báo / Đạt chuẩn), có nút "Đến Slide ➜" để nhảy nhanh đến vị trí cần sửa. Không tự động sửa nếu người dùng chưa click.

---

## 2. Danh Sách File Thuộc Quyền Sở Hữu Của Person B
- [templates/packs/basic/pack.json](file:///c:/Users/OS/Downloads/project/my-presentation/templates/packs/basic/pack.json)
- [templates/registry.js](file:///c:/Users/OS/Downloads/project/my-presentation/templates/registry.js)
- [templates/migration.js](file:///c:/Users/OS/Downloads/project/my-presentation/templates/migration.js)
- [templates/index.js](file:///c:/Users/OS/Downloads/project/my-presentation/templates/index.js)
- [templates/tokens.css](file:///c:/Users/OS/Downloads/project/my-presentation/templates/tokens.css)
- [templates/templates.css](file:///c:/Users/OS/Downloads/project/my-presentation/templates/templates.css)
- [studio/flow.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/flow.js)
- [studio/builder.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/builder.js)
- [studio/outline_editor.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/outline_editor.js)
- [studio/reducer.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/reducer.js)
- [studio/quality.js](file:///c:/Users/OS/Downloads/project/my-presentation/studio/quality.js)
- [studio.html](file:///c:/Users/OS/Downloads/project/my-presentation/studio.html)
- [outline_to_hyperframes.js](file:///c:/Users/OS/Downloads/project/my-presentation/outline_to_hyperframes.js)
- [docs/prototypes/gallery.html](file:///c:/Users/OS/Downloads/project/my-presentation/docs/prototypes/gallery.html)
- [docs/spikes/P6.1.md](file:///c:/Users/OS/Downloads/project/my-presentation/docs/spikes/P6.1.md)
- `tests/engine/*` (13 test files)

> **Cam kết ranh giới**: Person B không chỉnh sửa bất kỳ file nào thuộc quyền của Person A (`server/`, `scripts/`, `schemas/`, `server.js`, `storage/`, `tests/pipeline/`).

---

## 3. Kết Quả Kiểm Thử (Verification Status)

```bash
# 1. Kiểm tra toàn bộ Engine & Studio của Track B (61 tests):
pytest tests/engine
# Kết quả: 61/61 PASSED in 2.20s (100% green)

# 2. Kiểm tra Contract chung & Pipeline Track A (96 tests):
pytest tests/test_contracts.py tests/pipeline
# Kết quả: 96/96 PASSED in 87.80s (100% green, 0 regressions)

# 3. Snapshot testing của 10 layout:
pytest tests/engine/test_templates_snapshot.py
# Kết quả: 8/8 PASSED (Khớp pixel-identical)
```

---

## 4. Những Điểm Person A Cần Biết (Handoff to Track A)
1. **API Endpoints Tích Hợp Đã Hoạt Động**:
   - `GET /packs` & `GET /packs/{id}`: Studio đã kết nối nạp gallery từ backend, tự động fallback local registry khi offline.
   - `GET /projects/{id}/media-recommendations/{slideId}`: Media Strip đã kết nối lấy ứng viên hình ảnh.
   - `POST /projects/{id}/slides/{slideId}/chat`: Studio đã kết nối ô chat Copilot nhận patch và diff.
2. **Hợp Đồng Thẻ `<video>`**:
   - Khi render slide chứa video, Person A sử dụng đúng data attributes đã thống nhất trong `docs/spikes/P6.1.md`: `data-start`, `data-duration`, `data-media-start`, `data-media-end`, `data-volume="0.2"` (khi ducking với narration), `data-has-audio="true"`, `class="clip"`.
3. **Quy Tắc An Toàn Dữ Liệu**:
   - Mọi thay đổi từ Studio (Builder, Media Strip, Copilot Chat) đều là bản vá vào `LessonSceneJSON v2` (`slotValues`, `elements`, `media`, `animations`). Không có bất kỳ mã HTML thô nào được lưu vào đĩa trước khi người dùng thực hiện PUT scene qua Autosave.
