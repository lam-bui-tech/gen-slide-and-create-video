# 0001. Hybrid Presentation Architecture and AI Generation Pipeline

## Context
Người dùng cần xây dựng hệ thống chuyển đổi tài liệu bài giảng (bắt đầu với slide PowerPoint Triết học Mác - Lênin) thành bộ bài giảng đa phương tiện có giọng nói AI tiếng Việt (VieNeu-TTS - Duyên Hà My), cho phép người dùng không rành công nghệ tải tài liệu lên, tự động sinh bài giảng và chỉnh sửa dễ dàng.

## Decision
1. **Kiến trúc phân phối Hybrid**: Kết hợp giữa Web Slide tương tác (trình chiếu trên trình duyệt) và khả năng xuất Video MP4 thông qua HyperFrames timeline.
2. **Trải nghiệm biên tập Studio Dashboard**: Sử dụng bố cục 2 cột (Cột trái: Form chỉnh sửa nội dung/kịch bản; Cột phải: Live Preview và trình phát âm thanh).
3. **Phân tách nội dung**: Slide chỉ giữ các từ khóa/sơ đồ trực quan (Visual Layer), trong khi nội dung giảng bài chuyên sâu được chuyển thành lời giảng tự nhiên (Narration Script) để đọc bằng TTS.
4. **Động cơ giọng đọc (TTS Engine)**: Do API Cloud của VieNeu yêu cầu khóa API và tính phí theo ký tự phát sinh, hệ thống sử dụng mô hình mã nguồn mở miễn phí `pnnbao-ump/VieNeu-TTS-v3-Turbo` chạy trực tiếp thông qua thư viện Python cục bộ (hoặc Gradio API dự phòng).
