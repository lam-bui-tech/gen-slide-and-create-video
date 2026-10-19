# 01: [A] Multi-format Document Ingestion Service (PPTX, PDF, DOCX, Markdown)

**What to build:**
Giảng viên tải lên tài liệu bài giảng ở bất kỳ định dạng phổ biến nào (PowerPoint `.pptx`, Acrobat `.pdf` có bảng biểu, Word `.docx`, hoặc Markdown `.md`). Hệ thống tự động bóc tách cấu trúc nội dung (tiêu đề, các phần, gạch đầu dòng, bảng biểu, ảnh nhúng, và ghi chú giảng viên), lưu trữ ảnh nhúng vào `storage/projects/{id}/images/` với ID cố định, và trả về đối tượng `DocumentContext.json` hợp lệ 100% theo `schemas/document_context.json`.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] Viết bộ test TDD trong `tests/pipeline/test_ingestion.py` kiểm thử cả 4 định dạng với fixtures mẫu.
- [x] Mở rộng `scripts/pptx_to_lecture.py` và tích hợp bóc tách PDF, DOCX, MD trong `scripts/document_ingestion.py`.
- [x] Trích xuất ảnh nhúng ra thư mục `storage/projects/{id}/images/` và gán stable ID.
- [x] Bóc tách bảng biểu và speaker notes chính xác.
- [x] Trả về lỗi có kiểu rõ ràng (`UNSUPPORTED_FORMAT`, `FILE_TOO_LARGE`, `PARSE_FAILED`).
- [x] Cung cấp endpoint `POST /projects/{id}/documents` chuẩn theo `docs/API.md`.
