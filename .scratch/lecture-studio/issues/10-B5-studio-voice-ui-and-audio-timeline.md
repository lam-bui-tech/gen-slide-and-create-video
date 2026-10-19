# 10: [B] Studio Voice-Over UI & Audio-Driven Timeline Controls

**What to build:**
Tích hợp giao diện quản lý thuyết minh giọng nói và thanh tiến trình thời gian tổng thể trên Studio Dashboard:
1. **Narration Editor**: Khung soạn thảo lời thuyết minh bài giảng cho từng slide kèm nút "Sinh lại lời giảng (AI)" và nút "Tạo lại giọng đọc" (gọi API của Người A).
2. **Audio Player & Waveform**: Nghe thử file âm thanh `.wav` đã tạo, hiển thị chỉ báo sóng âm (soundwave) sinh động.
3. **Audio-Driven Timeline Bar**: Hiển thị độ dài thực tế của từng slide được đồng bộ theo file audio. Khi thời lượng audio thay đổi, thanh timeline co giãn và cập nhật tức thì toàn bộ thời gian của các slide phía sau.
4. **Export Gate Controller**: Vô hiệu hóa nút "Xuất Video / PDF" khi có bất kỳ tác vụ tổng hợp âm thanh nào đang chạy ngầm, hiển thị modal tiến độ xuất bản với thanh loading rõ ràng.

**Blocked by:** 08: [B] Studio Canvas Direct On-Screen Editing & State Autosave

**Status:** ready-for-agent

- [ ] Giao diện chỉnh sửa lời thoại thuyết minh từng slide.
- [ ] Tích hợp nút gọi `POST /projects/{id}/slides/{sid}/audio` và xử lý trạng thái loading/spinner.
- [ ] Hiển thị thanh Timeline tổng thể bài giảng trực quan, thể hiện tỷ lệ thời lượng các slide.
- [ ] Tự động cập nhật `durationSeconds` trên giao diện khi nhận được phản hồi từ TTS service.
- [ ] Modal tiến độ xuất bản (Render Progress Modal) kết nối với `POST /projects/{id}/export` và `GET /exports/{id}`.
