# 02: [A] Pedagogical Clarification Interview & LLM Provider Setup

**What to build:**
Hệ thống phân tích `DocumentContext` để tự động trả lời trước (pre-fill) 8 câu hỏi sư phạm cốt lõi (đối tượng học sinh, mục tiêu, thời lượng 5/10/15/20/45 phút, số slide, phong cách, câu hỏi tương tác, giọng thuyết minh) và chỉ yêu cầu giảng viên xác nhận hoặc điều chỉnh những điểm chưa rõ. Thiết lập tầng trừu tượng `LLMProvider` (hỗ trợ `GeminiProvider` với SDK Google GenAI, `OllamaProvider` cho local, và `FakeProvider` phục vụ kiểm thử tự động).

**Blocked by:** 01: [A] Multi-format Document Ingestion Service

**Status:** ready-for-agent

- [ ] Định nghĩa interface `LLMProvider` có phương thức `generate_structured(prompt, schema)` kèm cơ chế retry khi validate lỗi.
- [ ] Cài đặt `GeminiProvider` (Gemini Flash mặc định), `OllamaProvider`, và `FakeProvider`.
- [ ] Viết logic suy luận pre-filled answers từ `DocumentContext`.
- [ ] Cung cấp endpoint `GET /projects/{id}/clarification` và `POST /projects/{id}/clarification` theo `docs/API.md`.
- [ ] Viết unit tests kiểm thử bộ phỏng vấn với `FakeProvider`.
