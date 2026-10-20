# 0006. Kiến Trúc Template-First, Mô Hình Slot và Hỗ Trợ Đa Phương Tiện v2

**Trạng thái:** Đã chấp thuận (Accepted)  
**Ngày:** 2026-10-20  
**Người quyết định:** Tech Lead & Product Owner (Giảng viên / Người dùng)  
**Tài liệu liên quan:** `docs/AS_IS.md`, `prompt v2.md`

---

## Bối Cảnh

Phiên bản v1 của AI Lecture Studio đã hoạt động end-to-end từ tải tài liệu, sinh dàn ý, render HyperFrames, tổng hợp giọng nói VieNeu-TTS đến xuất video MP4 / PDF / PPTX. Tuy nhiên, v1 tồn tại 3 hạn chế nghiệm trọng:
1. Người dùng không được chọn mẫu thiết kế; 10 template bị hard-code trong mã nguồn, không có thư viện (gallery), không có danh mục và không thể tạo mới template.
2. Slide sinh ra thường trống trải, hiếm khi có ảnh; xuất hiện lỗi 404 console do route phục vụ static asset trong FastAPI và đường dẫn ảnh fallback không hợp lệ.
3. Không hỗ trợ chèn video minh họa, không có cơ chế tự động gợi ý đa phương tiện (ảnh, sơ đồ tư duy, biểu đồ).

---

## Các Quyết Định Đã Chốt

### 1. Template Pack vs Slide Layout (Q1)
- **1 Bài giảng = 1 Template Pack duy nhất (Deck Theme)**: Toàn bộ bài giảng dùng chung hệ Design Tokens (colors, fonts, spacing, motion effects) của Pack được chọn nhằm bảo đảm tính nhất quán sư phạm và thẩm mỹ cao cấp.
- Mỗi slide chọn một `layoutId` nằm trong Pack đó. Đổi phong cách bài giảng được thực hiện thông qua việc đổi `packId`.

### 2. Nơi Lưu Trữ & Registry (Q2)
- **File-based Template Registry**: Template Pack được lưu dưới dạng cấu trúc thư mục tĩnh (`templates/packs/<packId>/pack.json` + `layouts/` + assets).
- Ưu điểm: Độc lập với cơ sở dữ liệu, quản lý phiên bản dễ dàng qua Git, hỗ trợ chia sẻ/đóng gói/import/export bằng file zip, và cho phép kiểm thử tự động với TDD.

### 3. Mô hình Slot & Xử lý Tràn Chữ (Q3)
- Chuyển từ mảng `elements[]` tự do sang cấu trúc `slotValues{}` được định nghĩa chặt chẽ theo Layout Schema.
- **Xử lý tràn chữ (Overflow Policy)**: Áp dụng Auto-retry Feedback Loop với LLM để yêu cầu AI tóm tắt súc tích nội dung cho vừa khung hiển thị của Slot (`maxChars`, `maxItems`). Nếu vẫn tràn, tự động kích hoạt biến thể bố cục (Layout Variant) có diện tích hiển thị văn bản lớn hơn.

### 4. Nguồn Gợi Ý Media trong MVP (Q4)
- Tập trung vào **3 nguồn cốt lõi, hoàn toàn tự lưu trữ (self-hosted), miễn phí và an toàn bản quyền**:
  1. Ảnh thực tế trích xuất từ tài liệu bài giảng (PPTX/PDF/DOCX) với đường dẫn URL ổn định.
  2. Sơ đồ tư duy / Biểu đồ số liệu sinh động được tạo tự động (SVG, Mermaid, Chart.js).
  3. Ảnh/video do giảng viên tự tải lên (Upload).
- Nguồn ảnh sinh bằng AI bên ngoài (Gemini/HuggingFace) chỉ hỗ trợ dưới dạng cờ cấu hình tùy chọn (`ENABLE_AI_IMAGE`).

### 5. Nhúng Video Minh Họa (Q5)
- Hỗ trợ tệp video cục bộ (`.mp4`, `.webm`) tải lên trực tiếp vào slide.
- Hỗ trợ công cụ cắt điểm đầu/cuối (`trim start/end`), tự động giảm âm lượng video (ducking xuống 10-15%) khi có giọng đọc thuyết minh TTS.
- Thời lượng slide tuân thủ nguyên tắc Audio-First: `durationSeconds = max(audio_duration, video_duration)`.
- HyperFrames render video trực tiếp sang MP4 thông qua tính năng trích xuất khung hình tự động `--video-frame-format`.

### 6. Phạm Vi Template Builder v2.0 (Q6)
- Tái sử dụng Canvas Engine của Studio để tạo môi trường kéo thả trực quan.
- Cho phép thêm khối, định hình layout, gắn nhãn phần tử là **Slot** (quy định vai trò `role`, kiểu chấp nhận `accepts`, giới hạn `constraints`) hoặc **Decor** (trang trí cố định), gắn preset chuyển động GSAP và lưu vào Pack. Không xây dựng timeline đa track phức tạp.

### 7. Tương Thích Ngược & Chuyển Đổi (Q7)
- Áp dụng cơ chế **In-Memory Transparent Migration**: Khi mở các bài giảng cũ phiên bản v1, hệ thống tự động bọc 10 template cũ thành Pack "Basic", ánh xạ `templateId` -> `layoutId` và `elements[]` -> `slotValues{}` mà không làm thay đổi kết quả hiển thị hoặc phá hỏng dữ liệu gốc. Cung cấp thêm script CLI để người dùng có thể batch-convert nếu cần.

### 8. Hệ Thống Phân Loại & Metadata Template Pack (Q8)
- Phân loại chuẩn hóa theo 3 chiều: `subject` (môn học), `style` (phong cách trực quan), `effect` (nhịp điệu chuyển động).
- Pack mặc định "Basic" (10 layout) mang nhãn: subject: `tong-hop`, style: `hoc-thuat-nghiem-tuc`, effect: `nang-dong-kinetic`.

### 9. Tập Hợp Vai Trò Slot & Kiểu Dữ Liệu Chuẩn Hóa (Q9)
- Vai trò (`role`): `title`, `subtitle`, `badge`, `body`, `bullets`, `media`, `diagram`, `formula`, `quiz`, `timeline`.
- Kiểu dữ liệu (`accepts`): `text`, `list`, `image`, `video`, `diagram`, `chart`, `formula`.
- Có cấu trúc ràng buộc `constraints: { maxChars?, maxItems?, aspectRatio? }` và cờ `optional: boolean`.

### 10. Cơ Chế Clarification Thích Ứng (Q10)
- Tự động suy diễn chủ đề, môn học, đối tượng người học từ `DocumentContext` và Pack.
- Chỉ hiển thị modal hỏi khi độ tin cậy thấp (<80%), hỏi tùy chọn câu hỏi ôn tập (Quiz) và lựa chọn giọng đọc AI. Hiển thị thông tin suy đoán dưới dạng "Xác nhận hoặc chỉnh sửa" trong 1 màn hình ngắn gọn.

### 11. Xử Lý Khung Hình Video Khi Xuất Tĩnh (Q11)
- Khi xuất PDF và PPTX, hệ thống tự động trích xuất khung hình poster tại giây thứ 1 (hoặc `trimStart`) của video làm ảnh đại diện, kèm badge nhận diện `[🎬 Video Clip]` và ghi chú trong Speaker Notes.

### 12. Định Dạng Lưu Trữ Của Template Builder (Q12)
- Toàn bộ Layout do Template Builder tạo ra được lưu dưới dạng file JSON cấu trúc khai báo (`layout.json`), không sinh mã thực thi JavaScript, bảo đảm an toàn và tương thích tuyệt đối với schema validation.

---

## Hậu Quả & Tác Động

- **Tích cực**:
  - Kiến trúc chuyển đổi thành công sang Template-First, mở đường cho Template Gallery và Template Builder.
  - Sửa dứt điểm nguyên nhân gốc của lỗi 404 và tình trạng slide trắng.
  - Bảo toàn 100% các thành phần đã hoạt động tốt của v1 (Audio-first sync, SQLite Export job, Studio Autosave 500ms).
- **Cần theo dõi**:
  - Cần cập nhật contract test và JSON Schemas (`lesson_scene.json`, `lesson_outline.json`) đồng bộ giữa Python (Pydantic) và TypeScript/Node.js (Zod).
