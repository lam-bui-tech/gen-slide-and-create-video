# 07: [B] Outline to Scene & HyperFrames Composition Mapper

**What to build:**
Module `outline_to_hyperframes.js` đóng vai trò cầu nối thuần túy (pure transformation):
1. **Bước 1**: Nhận `LessonOutline` (dàn ý đã duyệt) và tự động ánh xạ thành `LessonSceneJSON` dựa trên registry 10 template và thuộc tính `suggestedTemplateId`.
2. **Bước 2**: Nhận `LessonSceneJSON` và biên dịch thành tệp `index.html` hoàn chỉnh (gồm đầy đủ các thẻ `.clip`, mốc `data-start`, thời lượng `durationSeconds`, audio track, và timeline GSAP điều khiển spotlight/hiệu ứng).
Thời điểm xuất hiện của các slide được tính toán tự động dựa trên `durationSeconds` (Audio-First Sync từ Người A), cho phép co giãn timeline mà không cần chỉnh sửa code.

**Blocked by:** 06: [B] Academic Pro Design Tokens & 10 Core HyperFrames HTML/CSS/GSAP Templates

**Status:** ready-for-agent

- [ ] Cài đặt registry 10 template sư phạm trong JavaScript.
- [ ] Hàm thuần `outlineToScene(outline: LessonOutline): LessonSceneJSON`.
- [ ] Hàm thuần `sceneToHyperFramesHtml(scene: LessonSceneJSON): string`.
- [ ] Tự động tính toán mốc `data-start` tích lũy cho từng slide: `start[i] = start[i-1] + duration[i-1]`.
- [ ] Viết unit tests kiểm thử mapper với `fixtures/outline.sample.json` và `fixtures/scene.sample.json`.
- [ ] Báo lỗi rõ ràng và dừng lại nếu input không hợp lệ theo JSON Schema.
