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

**TemplatePack**:
Gói chủ đề bài giảng hoàn chỉnh gồm bộ nhận diện trực quan (Design Tokens: màu sắc, phông chữ, khoảng cách), nhãn phân loại (môn học, phong cách, hiệu ứng) và một tập hợp các Layout có sẵn để AI/giảng viên lựa chọn cho toàn bộ bài học.
_Avoid_: theme, skin, slide deck thô

**Layout**:
Cấu trúc bố cục trực quan của một slide bài giảng phục vụ mục đích sư phạm cụ thể (giải thích khái niệm, so sánh, dòng thời gian, câu hỏi kiểm tra), định nghĩa các Slot chứa nội dung, phần tử trang trí cố định (Decor), các biến thể bố cục (Variants) và hiệu ứng chuyển động mặc định.
_Avoid_: slide template v1, raw HTML template

**Slot**:
Vị trí được xác định ranh giới và vai trò ngữ nghĩa trên Layout (như tiêu đề, nội dung chính, danh sách, công thức, ảnh/video, sơ đồ), quy định rõ các kiểu dữ liệu chấp nhận và ràng buộc hiển thị để AI hoặc người dùng điền nội dung vào.
_Avoid_: container, placeholder, div box

**Variant**:
Biến thể sắp đặt bố cục không gian của một Layout (như chữ trái - ảnh phải, ảnh trái - chữ phải, xếp dọc trên dưới, toàn màn hình, không ảnh) mà không làm thay đổi cấu trúc dữ liệu của các Slot.
_Avoid_: new layout, sub-template

**MediaCandidate**:
Ứng viên hình ảnh, sơ đồ hoặc video minh họa được hệ thống chuẩn bị sẵn (trích xuất từ tài liệu, sinh từ dữ liệu, hoặc giáo viên tải lên) kèm thông tin nguồn gốc, giấy phép và mức độ phù hợp để gợi ý cho slide.
_Avoid_: image asset, raw file

**SlotFiller**:
Bộ máy AI xử lý ngôn ngữ tự nhiên nhận nội dung tài liệu và schema của Layout để điền chính xác, có kiểm định cấu trúc vào các Slot tương ứng, tự động kích hoạt vòng lặp tóm tắt khi tràn chữ.
_Avoid_: outline mapper cứng, prompt generator

**MediaRecommender**:
Bộ phân tích nhu cầu thị giác (visual_need) của từng slide để xếp hạng và đề xuất 3-4 ứng viên MediaCandidate phù hợp nhất cho giáo viên chọn 1-chạm.
_Avoid_: image searcher, stock picker

**TemplateBuilder**:
Môi trường thiết kế đồ họa kéo thả trực quan trên nền tảng Canvas Engine của Studio, cho phép giáo viên tự tạo Layout mới, đánh dấu Slot/Decor, gán hiệu ứng GSAP và lưu vào Template Pack.
_Avoid_: slide designer, video editor
