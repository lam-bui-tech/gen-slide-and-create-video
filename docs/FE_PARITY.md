# AI Lecture Studio — Bảng Tiêu Chí Kiểm Tra Tính Tương Đồng (docs/FE_PARITY.md)

Tài liệu kiểm định sự tương đồng hành vi (Behavioral Parity Checklist) giữa giao diện cũ (`index.html` chạy trên cổng `:3000`) và giao diện mới (`Next.js 15` chạy trên cổng `:3001`).

Mỗi mục dưới đây đại diện cho một tính năng người dùng nhìn thấy và tương tác được trong Studio. Khi chuyển đổi sang Next.js, tất cả các mục phải đạt trạng thái **PASS**.

---

## Danh Sách 27 Tiêu Chí Parity (Numbered Checklist)

| STT | Mã Tiêu Chí | Tính Năng & Hành Vi Người Dùng | Phần Tử DOM Bản Cũ | Tiêu Chuẩn Nghiệm Thu (Acceptance Criteria) | Trạng Thái Bản Mới |
|---|---|---|---|---|---|
| 1 | `PARITY-01` | **Khởi tạo bài giảng mới sạch** | `#btn-new-project` | Click tạo bài mới hiện xác nhận nếu có thay đổi chưa lưu; khởi tạo scene mặc định 1 slide Title Slide, reset lịch sử undo/redo, lưu tự động. | Chờ F3/F6 |
| 2 | `PARITY-02` | **Đổi tên bài giảng trên Navbar** | `#project-title-input` | Sửa text trên ô input, khi blur cập nhật `scene.title` và kích hoạt autosave debounced. | Chờ F3 |
| 3 | `PARITY-03` | **Bộ Mẫu Giảng Dạy (Gallery & Switch Pack)** | `#btn-select-pack`, `#gallery-step-modal` | Bấm nút mở modal, nạp danh sách pack từ `/packs` (hoặc registry fallback), lọc theo từ khóa/môn học/phong cách, chọn card và áp dụng bộ mẫu cho scene. | Chờ F6 |
| 4 | `PARITY-04` | **Tải tài liệu đa định dạng (Upload Doc)** | `#btn-upload-doc`, `#input-doc-file` | Chọn tệp `.pptx`, `.pdf`, `.docx`, `.md`; kích hoạt modal tiến trình `upload-progress-modal`, tuần tự gọi tạo dự án và bóc tách tài liệu. | Chờ F6 |
| 5 | `PARITY-05` | **Hỏi làm rõ Sư phạm (Clarification Modal)** | `#clarification-modal` | Hiện modal với các câu hỏi: đối tượng người học, thời lượng, số lượng slide, câu hỏi trắc nghiệm, giọng đọc; submit gửi câu trả lời về backend. | Chờ F6 |
| 6 | `PARITY-06` | **Duyệt & Tinh chỉnh Dàn bài (Outline Review)** | `#outline-review-modal` | Hiển thị danh sách slide dạng thẻ có thể: sửa tiêu đề, đổi layout gợi ý, thêm slide mới, xóa slide, kéo thả đổi thứ tự; duyệt outline gửi về backend. | Chờ F6 |
| 7 | `PARITY-07` | **Điều hướng danh sách Slide (Slide Navigator)** | `#slide-list-container` | Hiển thị danh sách thumbnail số thứ tự; click chọn slide đổi khung canvas; nút nhân bản tạo bản sao liền sau; nút xóa có xác nhận. | Chờ F3 |
| 8 | `PARITY-08` | **Chuyển slide Trước / Sau** | `#btn-prev-slide`, `#btn-next-slide` | Nút ◀ và ▶ chuyển slide liền kề có chặn biên (slide đầu không lùi, slide cuối không tiến). | Chờ F3 |
| 9 | `PARITY-09` | **Hiển thị Canvas tỷ lệ chuẩn 1920×1080** | `#live-canvas` | Canvas hiển thị chính xác chuỗi HTML sinh ra từ `renderSlide(slide)` theo 10 layout và tự động scale co giãn theo kích thước khung nhìn màn hình. | Chờ F4 |
| 10 | `PARITY-10` | **Chỉnh sửa văn bản trực tiếp trên Canvas** | `.slide-title, .title-hero-sub, .concept-quote, ...` | 12 selector class có thuộc tính `contenteditable="true"`; khi gõ không bị mất dấu nháy (caret); khi blur commit action vào store. | Chờ F4 |
| 11 | `PARITY-11` | **Thay thế hình ảnh trực tiếp từ Canvas** | `img.editable-image`, `#image-modal` | Click vào bất kỳ ảnh minh họa nào trên canvas mở modal chọn ảnh; cho phép nhập URL trực tiếp hoặc tải tệp ảnh từ máy; bấm áp dụng cập nhật element. | Chờ F4/F6 |
| 12 | `PARITY-12` | **Đổi Layout Template ở Properties Panel** | `#prop-template-select` | Chọn layout khác trong danh sách dropdown lập tức chuyển đổi template và nạp các slot tương ứng của layout mới. | Chờ F5 |
| 13 | `PARITY-13` | **Đổi Layout Variant (Pills & Dropdown)** | `#variant-pills-container`, `#prop-variant-select` | Bấm chọn các biến thể giao diện (default, no-image, split, compact, full...) cập nhật class `variant-{name}` trên canvas tức thì. | Chờ F5 |
| 14 | `PARITY-14` | **Soạn thảo Thuyết minh & Thống kê từ** | `#prop-narration-input` | Nhập văn bản kịch bản giảng bài; cập nhật số lượng ký tự và thời lượng ước tính (180 từ/phút tiếng Việt) theo thời gian thực; blur commit voice. | Chờ F5 |
| 15 | `PARITY-15` | **Tạo lại Giọng đọc AI (VieNeu-TTS)** | `#btn-regen-voice`, `#slide-audio-player` | Bấm "Tạo Lại Giọng Đọc", hiện trạng thái đang tạo, gọi API tổng hợp audio, nạp file `.wav` vào trình phát audio và cập nhật `voice.durationSeconds`. | Chờ F5 |
| 16 | `PARITY-16` | **Đồng bộ thời lượng Audio-First** | `voice.durationSeconds` -> `slide.durationSeconds` | Khi thời lượng audio dài hơn animation hoặc thời lượng mặc định, slide tự động giãn ra để khớp với giọng đọc, cập nhật timeline slider. | Chờ F4/F5 |
| 17 | `PARITY-17` | **Dải gợi ý Media thông minh (Media Strip)** | `#media-recommendations-grid` | Tự động gọi gợi ý media theo `visualNeed` của slide; hiển thị lưới gợi ý; click 1 chạm để áp dụng trực tiếp vào slide. | Chờ F5 |
| 18 | `PARITY-18` | **Inspector Video Nhúng (Trim & Ducking)** | `#video-component-section` | Hiển thị khi slide có video nhúng: chỉnh đường dẫn, điểm bắt đầu (trimStart), điểm kết thúc (trimEnd), âm lượng, và bật/tắt ducking khi có giọng đọc. | Chờ F5 |
| 19 | `PARITY-19` | **Trợ lý Biên tập Slide Chat (Slide Chat)** | `#btn-slide-chat-send`, `#slide-chat-diff-box` | Nhập chỉ dẫn sửa slide (ví dụ: "rút ngắn tiêu đề"); gửi AI phân tích; hiển thị hộp so sánh sai khác (diff); cho phép Áp Dụng hoặc Hủy Bỏ. | Chờ F5 |
| 20 | `PARITY-20` | **Kiểm tra Chất lượng Sư phạm (Pedagogy Review)** | `#btn-pedagogy-review`, `#pedagogy-modal` | Bấm nút Sư Phạm hiển thị điểm số chất lượng (0-100%), nhãn đánh giá, đếm số lỗi/cảnh báo/đạt và bảng chi tiết các tiêu chí kiểm tra sư phạm. | Chờ F6 |
| 21 | `PARITY-21` | **Chế độ Tự Thiết Kế (Builder Mode)** | `#btn-toggle-builder-mode`, `#builder-canvas` | Bật chế độ builder: chuyển sang lưới vẽ, thanh công cụ thêm khối (Text, Image, Decor); kéo thả căn chỉnh theo lưới (snap-to-grid). | Chờ F7 |
| 22 | `PARITY-22` | **Gán vai trò Slot & Lưu Layout vào Pack** | `#builder-inspector-panel`, `#builder-save-layout` | Chọn khối, định nghĩa vai trò Slot Role hoặc Decor, đặt tên slot, ràng buộc độ dài, chọn hiệu ứng xuất hiện; bấm lưu xuất bố cục vào Template Pack. | Chờ F7 |
| 23 | `PARITY-23` | **Chế độ Trình Chiếu Toàn Màn Hình (Presentation)** | `#btn-presentation-mode`, `#presentation-modal` | Trình chiếu toàn bộ bài giảng: phóng to tỷ lệ 16:9 theo màn hình; thanh điều khiển HUD tự ẩn sau 2.5s; phát audio và tự chuyển slide khi hết thời lượng. | Chờ F8 |
| 24 | `PARITY-24` | **Xuất Bài Giảng (PDF & PPTX Polling)** | `#btn-export-pdf`, `#btn-export-pptx` | Bấm xuất PDF/PPTX; kích hoạt tiến trình ngầm; thăm dò trạng thái (polling) `/exports/{id}` đến khi hoàn tất và cung cấp link tải về. | Chờ F8 |
| 25 | `PARITY-25` | **Xuất Video MP4 (1080p HyperFrames)** | `#btn-export-mp4` | Lưu scene và kích hoạt tiến trình render video MP4 qua HyperFrames CLI; thông báo ID tác vụ cho người dùng. | Chờ F8 |
| 26 | `PARITY-26` | **Lịch sử Hoàn tác (Undo / Redo & Autosave)** | `#btn-undo`, `#btn-redo`, `#save-status` | Hỗ trợ tối đa 30 bước hoàn tác/làm lại; lưu tự động sau 500ms không thao tác kèm chỉ báo màu sắc (Đang lưu / Đã lưu / Lỗi lưu). | Chờ F2/F3 |
| 27 | `PARITY-27` | **Phím tắt Bàn phím (Keyboard Shortcuts)** | `Ctrl+Z`, `Ctrl+Y`, `Alt+◀`, `Alt+▶`, `Ctrl+Space` | Undo/Redo bằng Ctrl+Z / Ctrl+Y; chuyển slide bằng Alt+Trái / Alt+Phải; phát/dừng timeline bằng Ctrl+Space; trong trình chiếu: Space, Phím mũi tên, Escape, F. | Chờ F3/F4/F8 |

---

## Tiêu Chuẩn Vượt Cổng (Gate Criteria)
- Tất cả 27 mục trên phải được kiểm tra thực tế trên ứng dụng Next.js tại cổng `:3001`.
- Bộ test Playwright end-to-end phải vượt qua 100% không có lỗi console hoặc lệch cấu trúc DOM.
