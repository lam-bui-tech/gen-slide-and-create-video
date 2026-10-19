# 05: [A] Multi-format Export Jobs (MP4 1080p, PDF, Editable PPTX)

**What to build:**
Hệ thống hàng đợi xuất bản bài giảng đa định dạng dưới dạng background jobs (quản lý trạng thái `pending`, `running`, `completed`, `failed` trong SQLite):
1. **Video MP4**: Gọi lệnh `npx hyperframes render` kết xuất video 1080p 30fps có đầy đủ âm thanh giọng đọc và hiệu ứng chuyển động GSAP mượt mà.
2. **Tài liệu PDF**: Chụp vector toàn bộ các slide bằng Headless Chrome (Puppeteer/Playwright) bảo đảm sắc nét và nhúng font tiếng Việt đầy đủ.
3. **PowerPoint Khả Biên Tập (Editable PPTX)**: Dùng `python-pptx` ánh xạ `LessonSceneJSON` sang các native shapes, text frames và chèn lời thuyết minh vào ô Speaker Notes của từng slide.

**Blocked by:** 04: [A] VieNeu-TTS Voice Synthesis & Audio-First Dynamic Sync Engine

**Status:** ready-for-agent

- [ ] Cài đặt hàng đợi Background Jobs lưu trạng thái trong SQLite (`storage/lecture_studio.db`).
- [ ] Tích hợp `npx hyperframes render` chạy subprocess an toàn có timeout, bắt log tiến độ (%) và xử lý dọn dẹp file tạm.
- [ ] Tích hợp xuất PDF vector chất lượng cao qua Headless Chrome print.
- [ ] Tích hợp generator `python-pptx` xuất file PowerPoint có text/shape chỉnh sửa được.
- [ ] Cung cấp endpoint `POST /projects/{id}/export` và `GET /exports/{id}` theo `docs/API.md`.
- [ ] Viết test tự động kiểm tra sự tồn tại của file xuất, thời lượng MP4 khớp tổng thời lượng các slide, số trang PDF và số slide PPTX chính xác.
