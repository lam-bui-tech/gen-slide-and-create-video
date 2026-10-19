# 03: [A] Pedagogical Outline Generator & Approval API

**What to build:**
Hệ thống sử dụng LLM để chuyển đổi tài liệu thô (`DocumentContext`) kết hợp câu trả lời phỏng vấn thành một dàn bài bài giảng sư phạm hoàn chỉnh (`LessonOutline` gồm mục tiêu học tập, danh sách slide dự kiến, câu hỏi trắc nghiệm và tổng kết). Mỗi slide đề xuất chính xác 1 trong 10 template sư phạm. Giảng viên có thể xem, chỉnh sửa nội dung từng ý và bấm nút phê duyệt (`approve`). Tiến trình sinh slide (`scene`) bị khóa cho đến khi outline được duyệt.

**Blocked by:** 02: [A] Pedagogical Clarification Interview & LLM Provider Setup

**Status:** completed

- [x] Thiết kế prompt kỹ thuật yêu cầu LLM sinh JSON cấu trúc theo `schemas/lesson_outline.json`.
- [x] Ánh xạ chính xác các loại nội dung vào 10 template: `title-slide`, `learning-objectives`, `concept-explain`, `bullet-breakdown`, `image-explain`, `comparison`, `timeline`, `formula-explain`, `quiz`, `summary`.
- [x] Cung cấp endpoint `POST /projects/{id}/outline` (sinh mới), `GET /projects/{id}/outline`, và `PUT /projects/{id}/outline` (sửa / duyệt).
- [x] Kiểm thử tự động với `FakeProvider` và script chạy thực tế với Gemini Flash (`scripts/manual_run_gemini_outline.py`).
