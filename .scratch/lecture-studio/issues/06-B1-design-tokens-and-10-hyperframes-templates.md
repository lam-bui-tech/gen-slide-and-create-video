# 06: [B] Academic Pro Design Tokens & 10 Core HyperFrames HTML/CSS/GSAP Templates

**What to build:**
Xây dựng file design tokens chuẩn (bảng màu Academic Ocean & Amber, font tiếng Việt tối ưu như Be Vietnam Pro / Inter, khoảng cách, và lưới 1920x1080) và bộ thư viện 10 template sư phạm chuẩn HyperFrames dưới dạng các thành phần HTML/CSS/GSAP tái sử dụng:
1. `title-slide` — Slide mở đầu bài giảng (Tiêu đề, giảng viên, môn học, badge).
2. `learning-objectives` — Mục tiêu chuẩn đầu ra bài học (3-4 bullet điểm nhấn).
3. `concept-explain` — Giải thích khái niệm (Text định nghĩa nổi bật + hình minh họa).
4. `bullet-breakdown` — Phân tích luận điểm theo từng thẻ card phân cấp thị giác.
5. `image-explain` — Sơ đồ tư duy hoặc hình ảnh lớn kèm chú thích trực quan bên cạnh.
6. `comparison` — Đối chiếu 2 cột đối xứng (Ưu/Nhược, Duy vật vs Duy tâm).
7. `timeline` — Trục thời gian tiến trình lịch sử hoặc quy trình các bước.
8. `formula-explain` — Công thức, định lý kèm phân tích các thành phần.
9. `quiz` — Câu hỏi kiểm tra nhanh dạng trắc nghiệm 4 lựa chọn tương tác.
10. `summary` — Tổng kết toàn bộ bài học & lời dặn dò.
Mỗi template tuân thủ chặt chẽ chuẩn HyperFrames (`.clip`, `data-start`, paused root timeline, animation cues) và đạt 100% WCAG AA contrast.

**Blocked by:** None (có thể bắt đầu ngay từ `fixtures/scene.sample.json`).

**Status:** ready-for-agent

- [ ] Tạo file tokens thiết kế `templates/tokens.css` (màu sắc, typography, shadows, radius).
- [ ] Xây dựng 10 template trong thư mục `templates/` tương thích với cấu trúc của `fixtures/scene.sample.json`.
- [ ] Hỗ trợ các biến thể bố cục (`layoutVariant`: `text-left-image-right`, `text-right-image-left`, `stacked-top`, `fullscreen`, `no-image`).
- [ ] Kiểm thử hiển thị snapshot tiếng Việt (chống tràn chữ, giữ dấu thanh, hiển thị sắc nét trên màn hình 1080p).
- [ ] Chạy `npm run check` bảo đảm vượt qua toàn bộ linter và contrast check.
