# 0005. Studio Client-Side Editing, Decoupled Layout Variants, and Native Editable PPTX Export

## Context
Trong Sprint 0, chúng ta cần thống nhất cơ chế cập nhật trạng thái trong Studio, cấu trúc định nghĩa bố cục (Layout Variants) của 10 template sư phạm, và chiến lược kết xuất bài giảng sang định dạng Microsoft PowerPoint (.pptx).

## Decision
1. **Cơ chế Biên tập Studio (Client-Side State & Debounced Autosave)**:
   - Giao diện Web Studio duy trì toàn bộ trạng thái `LessonSceneJSON` tại client.
   - Các thao tác click-to-edit chữ (ContentEditable) hoặc đổi ảnh cập nhật DOM và state tức thì (0ms latency).
   - Bản cập nhật được gửi tự động (debounced 500ms) lên máy chủ qua endpoint `PUT /projects/{id}/scene` (hoặc `PUT /projects/{id}/slides/{sid}`).
   - Khi bấm xem trước ("Play Slide"), client khởi chạy trực tiếp timeline GSAP của slide tương ứng mà không cần chờ máy chủ render lại HTML.

2. **Tách biệt Ngữ nghĩa Template và Bố cục Hiển thị (`layoutVariant`)**:
   - `templateId` định danh cấu trúc ngữ nghĩa sư phạm (1 trong 10 template: `title-slide`, `learning-objectives`, `concept-explain`, `bullet-breakdown`, `image-explain`, `comparison`, `timeline`, `formula-explain`, `quiz`, `summary`).
   - `layoutVariant` là một trường thuộc tính riêng biệt trong mỗi slide (ví dụ: `text-left-image-right`, `text-right-image-left`, `stacked-top`, `full-bleed`, `no-image`).
   - Chuyển đổi variant chỉ thay đổi lớp hiển thị (CSS flexbox/grid layout) mà không làm mất hay xáo trộn dữ liệu nội dung của slide.

3. **Xuất Bản PowerPoint Khả Biên Tập (Native Editable PPTX via `python-pptx`)**:
   - Khác với phương án image-pack tĩnh, hệ thống sử dụng `LessonSceneJSON` làm nguồn dữ liệu gốc (Single Source of Truth) để sinh trực tiếp file `.pptx` bằng thư viện `python-pptx`.
   - Mỗi `templateId` và `layoutVariant` được ánh xạ sang các Native Shapes, TextBoxes và Table của PowerPoint tương ứng:
     - Tiêu đề, đề mục, gạch đầu dòng và nội dung giải thích được xuất dưới dạng văn bản vector chỉnh sửa được (editable text).
     - Định dạng font chữ tiếng Việt (hỗ trợ đầy đủ bảng mã Unicode: Arial, Be Vietnam Pro, Montserrat).
     - Ảnh minh họa được chèn vào đúng khung vị trí định sẵn.
     - Lời thoại thuyết minh được nhúng chuẩn xác vào ô **Speaker Notes** của từng slide trong PowerPoint.
