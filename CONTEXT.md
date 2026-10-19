# Lecture Presentation Context

Hệ thống tự động hóa chuyển đổi tài liệu bài giảng thành bài trình chiếu đa phương tiện tương tác, tích hợp giọng nói AI và hỗ trợ biên tập không cần code.

## Language

**Lecture Slide**:
Một trang trình chiếu trực quan chứa từ khóa, sơ đồ và hình ảnh tóm lược nội dung bài học.
_Avoid_: Page, screen, slide thô

**Narration Script**:
Đoạn văn bản lời giảng giải sư phạm do AI biên soạn cho từng slide để công cụ tổng hợp giọng nói chuyển thành âm thanh.
_Avoid_: Subtitle, transcript, prompt

**Voice Track**:
Tệp âm thanh giọng đọc AI tương ứng với từng slide bài giảng, được đồng bộ thời lượng với hiệu ứng hình ảnh.
_Avoid_: Audio file, sound effect

**Template Slot**:
Khuôn mẫu bố cục giao diện xác định (như Title, Khái niệm, So sánh 2 cột, Lộ trình thời gian) để nội dung bài học tự động khớp vào.
_Avoid_: Layout preset, design theme

**Interactive Visual Diagram**:
Sơ đồ tư duy dạng node kết nối động (như 3 nấc thang nhận thức, cân bằng đối xứng duy vật - duy tâm) với đường nối SVG và hiệu ứng thị giác sinh động.
_Avoid_: Static chart, mindmap tĩnh, ảnh vẽ sẵn

**Kinetic Spotlight**:
Hiệu ứng làm nổi bật có chủ đích (glow, scale, viền sáng) lên các khối nội dung hoặc node sơ đồ tương ứng với câu giảng hiện tại.
_Avoid_: Zoom in, highlight tĩnh

**Studio Dashboard**:
Giao diện quản lý 2 cột dành cho người dùng không chuyên kỹ thuật, cho phép chỉnh sửa nội dung bài giảng và nghe xem trước theo thời gian thực.
_Avoid_: Admin panel, CMS, backend

**LessonSceneJSON**:
Dữ liệu JSON chuẩn hóa duy nhất đặc tả toàn bộ bài giảng, bao gồm các slide, thành phần nội dung, hiệu ứng animation và thông số âm thanh.
_Avoid_: raw HTML, DOM tree, page state

**DocumentContext**:
Cấu trúc dữ liệu bóc tách từ tài liệu đầu vào (PPTX, PDF, DOCX, MD), gồm tiêu đề, các phần, bullet points, bảng biểu và ghi chú.
_Avoid_: raw text, parsed dump

**LessonOutline**:
Dàn ý bài giảng theo chuẩn sư phạm do AI sinh ra, chứa mục tiêu học tập, danh sách các slide dự kiến kèm template đề xuất để giảng viên phê duyệt trước khi tạo slide.
_Avoid_: table of contents, syllabus

**Layout Variant**:
Biến thể bố cục trực quan trong cùng một Template Slot mà không làm biến đổi cấu trúc ngữ nghĩa nội dung.
_Avoid_: custom theme, template clone

**Editable PPTX**:
Tệp bài giảng Microsoft PowerPoint chứa các shape và khung chữ (text frames) nguyên bản có thể chỉnh sửa trực tiếp, được ánh xạ từ LessonSceneJSON.
_Avoid_: image-only slide, screenshot pack
