# 09: [B] Layout Variant Switcher & Animation Preset Picker

**What to build:**
Tích hợp thanh công cụ điều khiển bố cục và hiệu ứng động trực tiếp trên Studio Canvas:
1. **Layout Variant Switcher**: Cho phép giảng viên đổi nhanh kiểu bố cục của slide hiện tại (Text trái - Ảnh phải ⟷ Text phải - Ảnh trái ⟷ Banner trên ⟷ Toàn màn hình ⟷ Không ảnh) thông qua menu dropdown/icon trực quan. Khi đổi variant, nội dung text và dữ liệu của slide được giữ nguyên vẹn.
2. **Animation Preset Picker**: Cho phép chọn hiệu ứng chuyển động GSAP cho từng phần tử (tiêu đề, thẻ card, hình ảnh) từ bộ 6 preset chuẩn (`fade-in`, `slide-in`, `zoom-in`, `typewriter`, `step-by-step`, `highlight-keyword`), kèm thanh trượt tinh chỉnh delay và duration.
3. **Single-slide Interactive Preview**: Trình phát thử chuyển động của riêng slide đang chọn (Play/Pause/Scrub timeline) để kiểm tra tức thì hiệu ứng mà không phải chờ render toàn bộ bài giảng.

**Blocked by:** 08: [B] Studio Canvas Direct On-Screen Editing & State Autosave

**Status:** ready-for-agent

- [ ] Component giao diện chọn `layoutVariant` với thumbnail minh họa trực quan.
- [ ] Component giao diện chọn `animation.preset` cho từng đối tượng element.
- [ ] Trình điều khiển playback thời gian thực cho 1 slide (Play, Pause, Replay, Scrub bar).
- [ ] Cập nhật tức thì vào `LessonSceneJSON` khi người dùng thay đổi lựa chọn.
