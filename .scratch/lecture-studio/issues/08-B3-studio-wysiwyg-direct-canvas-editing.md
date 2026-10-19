# 08: [B] Studio Canvas Direct On-Screen Editing & State Autosave

**What to build:**
Nâng cấp giao diện Web Studio (`studio.html` / `studio/`) theo mô hình WYSIWYG 2 cột trực quan:
- **Cột trái**: Danh sách các slide kèm thumbnail, loại template, thời lượng và kịch bản thuyết minh.
- **Cột phải (Live Canvas)**: Khung xem trước 16:9 chất lượng cao. Giảng viên có thể **click trực tiếp vào tiêu đề, ý chính, hoặc thẻ nội dung trên canvas để sửa chữ (ContentEditable)** và **click vào hình ảnh để mở modal chọn ảnh từ thư viện hoặc tải ảnh mới lên**.
Mọi thao tác chỉnh sửa trực tiếp trên màn hình đều được đồng bộ hai chiều vào đối tượng `LessonSceneJSON` tại client, không bao giờ chỉnh sửa HTML thô. Có tính năng Undo/Redo và cơ chế tự động lưu ngầm (Debounced Autosave 500ms) gọi `PUT /projects/{id}/scene`.

**Blocked by:** 06: [B] Academic Pro Design Tokens & 10 Core HyperFrames HTML/CSS/GSAP Templates

**Status:** ready-for-agent

- [ ] Nâng cấp bố cục Studio: Slide Navigator (trái), Live WYSIWYG Canvas (giữa/phải), Properties Panel (phải).
- [ ] Chế độ ContentEditable trực tiếp trên Canvas với chỉ báo viền xanh tinh tế khi focus.
- [ ] Modal chọn/tải ảnh minh họa khi click vào khung ảnh.
- [ ] Quản lý trạng thái client bằng Reducer/Store chuẩn hóa, sinh patch hợp lệ cho `LessonSceneJSON`.
- [ ] Bộ nhớ lịch sử thao tác Undo / Redo (Ctrl+Z / Ctrl+Y).
- [ ] Cơ chế Autosave ngầm debounce 500ms gửi `PUT /projects/{id}/scene` (kèm cờ thông báo "Đã lưu / Đang lưu").
- [ ] Unit tests cho Reducer và logic patch state.
