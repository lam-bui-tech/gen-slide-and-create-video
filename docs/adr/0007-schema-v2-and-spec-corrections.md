# 0007. Điều Chỉnh Đặc Tả Schema v2 Và Khắc Phục Lệch Chuẩn Hợp Đồng

**Trạng thái:** Đã chấp thuận (Accepted)  
**Ngày:** 2026-10-20  
**Tác giả:** Người A (Backend / Pipeline)  
**Tài liệu liên quan:** `docs/SPEC_V2.md`, `schemas/`, `tests/test_contracts.py`

---

## Bối Cảnh

Trong quá trình triển khai chi tiết các JSON Schemas v2, mô hình Pydantic (`schemas/models.py`) và TypeScript/Zod types (`schemas/types.ts`) theo `docs/SPEC_V2.md`, một số điểm bất cập về mặt kỹ thuật và tính tương thích ngược đã được phát hiện và cần chuẩn hóa:

1. **Thuộc tính âm thanh trong VoiceConfig:** `SPEC_V2` quy định `voice.audioUrl` và `voice.durationSeconds` là các trường bắt buộc không-null (`required non-null`). Tuy nhiên, khi AI mới điền nội dung slide (SlotFiller) trước khi kích hoạt bước tổng hợp giọng đọc TTS, slide chưa thể có file audio và thời lượng đo đạc thực tế. Nếu ép buộc non-null thì scene khởi tạo sẽ lập tức vi phạm validation.
2. **Khóa cứng Enum trong LessonOutline:** `schemas/lesson_outline.json` đang khóa cứng `suggestedTemplateId` trong danh sách 10 ID cũ của v1. Điều này ngăn cản việc mở rộng các Layout mới thuộc các Template Pack khác nhau.
3. **Quản lý tập trung Tag Enums:** Cần có một điểm quy tụ duy nhất cho các bộ nhãn phân loại (`subject`, `style`, `effect`) giữa JSON Schema, Pydantic và Zod để tránh trôi lệch chuẩn (drift).

---

## Các Quyết Định Điều Chỉnh

1. **Cho phép Nullable cho Audio Metadata:**
   - Trong `schemas/lesson_scene.json`, `VoiceConfig.audioUrl` và `VoiceConfig.durationSeconds` được định nghĩa kiểu `["string", "null"]` và `["number", "null"]`.
   - Trong Pydantic model và Zod schema, các trường này là `Optional[str] = None` và `Optional[float] = None`.
2. **Linh hoạt hóa Layout Identifier trong Outline:**
   - Bổ sung trường `suggestedLayoutId: Optional[str] = None` vào `OutlineSlide`.
   - Nới lỏng `suggestedTemplateId` từ enum cứng thành `string`, hỗ trợ cả 2 trường song song để tương thích hoàn toàn với các outline v1 cũ.
3. **Tập trung hóa Enums:**
   - `SubjectTag` (6 giá trị: `toan-tin`, `khoa-hoc-tu-nhien`, `xa-hoi-nhan-van`, `ngoai-ngu`, `kinh-te-quan-tri`, `tong-hop`).
   - `StyleTag` (4 giá trị: `hoc-thuat-nghiem-tuc`, `hien-dai-toi-gian`, `sinh-dong-tre-trung`, `cong-nghe-tuong-lai`).
   - `EffectTag` (3 giá trị: `nhe-nhang-fade`, `nang-dong-kinetic`, `chu-danh-may-typewriter`).
   - Tất cả đều được kiểm tra chống trôi lệch thông qua `tests/test_contracts.py:test_enum_no_drift`.
4. **Bảo tồn Schema v1:**
   - Lưu trữ bản sao `schemas/lesson_scene_v1.json` để phục vụ trực tiếp việc kiểm định và migration an toàn cho các project cũ.

---

## Kết Quả & Nghiệm Thu
- Toàn bộ 7/7 bài kiểm tra trong `tests/test_contracts.py` đều đạt (PASS).
- Hợp đồng chung giữa Python và TypeScript đã được đồng bộ 100%, sẵn sàng cho Người B triển khai Template Registry (P1.4, P1.5).
