# AI Lecture Studio — API Specification Contract

> **Base URL**: `http://localhost:3000/api` (Node.js Gateway / Express Server)  
> **Internal AI/Pipeline Service**: `http://127.0.0.1:8000` (Python FastAPI Service)  
> **Source of Truth**: Tuân thủ nghiêm ngặt các schema trong `schemas/` (`DocumentContext`, `LessonOutline`, `LessonSceneJSON`).

---

## 1. Mã Lỗi Chuẩn (Standard Error Codes)

Tất cả các lỗi trả về mã trạng thái HTTP chuẩn kèm cấu trúc JSON:
```json
{
  "error": {
    "code": "INVALID_SCHEMA | NOT_FOUND | UNSUPPORTED_FORMAT | FILE_TOO_LARGE | LLM_TIMEOUT | TTS_FAILED | EXPORT_BUSY",
    "message": "Mô tả chi tiết lỗi tiếng Việt hoặc tiếng Anh",
    "details": {}
  }
}
```

| HTTP Status | Error Code | Ý nghĩa |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_SCHEMA` | Dữ liệu gửi lên không khớp với schema tương ứng trong `schemas/`. |
| `400 Bad Request` | `UNSUPPORTED_FORMAT` | Định dạng tệp không được hỗ trợ (chỉ nhận `.pptx`, `.pdf`, `.docx`, `.md`). |
| `404 Not Found` | `NOT_FOUND` | Không tìm thấy `projectId`, `slideId`, hoặc `exportId`. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | Tệp tải lên vượt quá giới hạn (mặc định 50MB). |
| `422 Unprocessable Entity`| `OUTLINE_NOT_APPROVED` | Cố gắng sinh slide (`scene`) khi `LessonOutline` chưa được duyệt (`status != approved`). |
| `500 Internal Error` | `TTS_FAILED` | Mô hình VieNeu-TTS gặp lỗi trong quá trình tổng hợp âm thanh. |
| `500 Internal Error` | `EXPORT_FAILED` | Tiến trình HyperFrames render hoặc chuyển đổi PowerPoint thất bại. |

---

## 2. Danh Sách Endpoint Chi Tiết

### 2.1. Quản lý Dự án (Projects)

#### `POST /projects`
Tạo một bài giảng mới.
- **Request Body**:
  ```json
  {
    "title": "Tên bài giảng (tùy chọn)"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "projectId": "proj-a1b2c3d4",
    "title": "Bài giảng mới",
    "currentStep": "upload",
    "createdAt": "2026-10-19T16:00:00Z"
  }
  ```

---

### 2.2. Bóc Tách Tài Liệu (Document Ingestion)

#### `POST /projects/{id}/documents`
Tải lên tệp tài liệu bài giảng gốc (PPTX, PDF, DOCX, Markdown) và bóc tách thành cấu trúc chuẩn.
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: Binary file (.pptx | .pdf | .docx | .md, tối đa 50MB)
- **Response `200 OK`**:
  - Tuân thủ chính xác [schemas/document_context.json](file:///c:/Users/OS/Downloads/project/my-presentation/schemas/document_context.json)
  ```json
  {
    "title": "Khái luận về Triết học và Triết học Mác - Lênin",
    "sourceFileName": "bai_giang.pptx",
    "fileType": "pptx",
    "sections": [ ... ],
    "extractedImages": [ ... ],
    "metadata": { "totalSlidesOriginal": 6 }
  }
  ```
- **Errors**: `400 UNSUPPORTED_FORMAT`, `413 FILE_TOO_LARGE`, `500 PARSE_FAILED`.

---

### 2.3. Phỏng Vấn Làm Rõ Sư Phạm (Clarification Interview)

#### `GET /projects/{id}/clarification`
Lấy 8 câu hỏi làm rõ sư phạm, tự động điền sẵn (pre-filled) dựa trên `DocumentContext` đã phân tích.
- **Response `200 OK`**:
  ```json
  {
    "questions": [
      {
        "id": "targetAudience",
        "question": "Đối tượng học tập trọng tâm của bài giảng là ai?",
        "type": "single-choice",
        "options": ["Sinh viên đại học", "Học sinh THPT", "Đại chúng / Đi làm"],
        "suggestedAnswer": "Sinh viên đại học"
      },
      {
        "id": "estimatedDurationMinutes",
        "question": "Thời lượng bài giảng mong muốn?",
        "type": "single-choice",
        "options": [5, 10, 15, 20, 45],
        "suggestedAnswer": 15
      },
      {
        "id": "targetSlideCount",
        "question": "Số lượng slide dự kiến?",
        "type": "number",
        "suggestedAnswer": 10
      },
      {
        "id": "style",
        "question": "Phong cách trình bày hình ảnh?",
        "type": "single-choice",
        "options": ["academic-ocean", "modern-minimal", "classic-warm"],
        "suggestedAnswer": "academic-ocean"
      },
      {
        "id": "includeQuiz",
        "question": "Có tích hợp câu hỏi kiểm tra nhanh (check-in quiz) không?",
        "type": "boolean",
        "suggestedAnswer": true
      }
    ]
  }
  ```

#### `POST /projects/{id}/clarification`
Gửi câu trả lời xác nhận từ giảng viên.
- **Request Body**:
  ```json
  {
    "answers": {
      "targetAudience": "Sinh viên đại học năm 1",
      "estimatedDurationMinutes": 15,
      "targetSlideCount": 10,
      "style": "academic-ocean",
      "includeQuiz": true
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "ready_for_outline"
  }
  ```

---

### 2.4. Dàn Bài Sư Phạm (LessonOutline)

#### `POST /projects/{id}/outline`
Kích hoạt LLM (Gemini Flash / Ollama) để sinh `LessonOutline` từ `DocumentContext` và câu trả lời phỏng vấn.
- **Response `200 OK`**:
  - Tuân thủ [schemas/lesson_outline.json](file:///c:/Users/OS/Downloads/project/my-presentation/schemas/lesson_outline.json)
  ```json
  {
    "topic": "Khái luận Triết học Mác - Lênin",
    "targetAudience": "Sinh viên đại học năm 1",
    "estimatedDurationMinutes": 15,
    "learningObjectives": [ ... ],
    "slides": [
      {
        "slideId": "slide-01",
        "suggestedTemplateId": "title-slide",
        "title": "Triết học và Triết học Mác - Lênin",
        "keyTakeaways": [ ... ],
        "speakerNotesDraft": "..."
      }
    ],
    "quiz": [ ... ],
    "summary": "...",
    "status": "draft"
  }
  ```

#### `GET /projects/{id}/outline`
Lấy dàn bài hiện tại của bài giảng.
- **Response `200 OK`**: Trả về `LessonOutline`.

#### `PUT /projects/{id}/outline`
Giảng viên chỉnh sửa hoặc phê duyệt (`approve`) dàn bài.
- **Request Body**: Toàn bộ đối tượng `LessonOutline` hoặc patch cập nhật:
  ```json
  {
    "status": "approved",
    "slides": [ ... ]
  }
  ```
- **Response `200 OK`**: Trả về `LessonOutline` đã cập nhật.

---

### 2.5. Điều Khiển Slide & Scene (HyperFrames Source of Truth)

#### `POST /projects/{id}/scene`
Kích hoạt bộ mapper chuyển từ `LessonOutline` (đã `approved`) sang `LessonSceneJSON`.
- **Pre-condition**: Outline phải có `status == "approved"`.
- **Response `201 Created`**:
  - Tuân thủ [schemas/lesson_scene.json](file:///c:/Users/OS/Downloads/project/my-presentation/schemas/lesson_scene.json)
  ```json
  {
    "projectId": "proj-a1b2c3d4",
    "title": "Khái luận Triết học Mác - Lênin",
    "slides": [ ... 10 slides ... ],
    "totalDurationSeconds": 165.5
  }
  ```
- **Errors**: `422 OUTLINE_NOT_APPROVED`.

#### `GET /projects/{id}/scene`
Lấy toàn bộ cấu trúc bài giảng hiện tại để Web Studio hiển thị hoặc render.
- **Response `200 OK`**: Trả về `LessonSceneJSON`.

#### `PUT /projects/{id}/scene`
Lưu bản cập nhật `LessonSceneJSON` từ Studio (Debounced Autosave 500ms khi người dùng sửa text, đổi ảnh, đổi animation preset, đổi layout variant).
- **Request Body**: Toàn bộ `LessonSceneJSON` hoặc danh sách slide được cập nhật.
- **Response `200 OK`**:
  ```json
  {
    "status": "saved",
    "savedAt": "2026-10-19T16:05:00Z"
  }
  ```
- **Errors**: `400 INVALID_SCHEMA`.

---

### 2.6. Đồng Bộ Giọng Nói Từng Slide (Voice & Audio-First Sync)

#### `POST /projects/{id}/slides/{sid}/narration`
Tạo lại câu thuyết minh sư phạm cho 1 slide cụ thể thông qua LLM.
- **Request Body**:
  ```json
  {
    "instruction": "Làm cho câu giảng ngắn gọn và dễ hiểu hơn với sinh viên mới vào trường."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "slideId": "slide-02",
    "narration": "Câu thuyết minh mới do AI sinh ra..."
  }
  ```

#### `POST /projects/{id}/slides/{sid}/audio`
Gọi VieNeu-TTS v3 Turbo tổng hợp giọng đọc cho slide, tự động đo thời lượng âm thanh và cập nhật timeline.
- **Request Body**:
  ```json
  {
    "narration": "Đoạn văn bản thuyết minh tiếng Việt cần đọc",
    "voiceId": "MyDuyen"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "slideId": "slide-02",
    "audioUrl": "storage/projects/proj-a1b2c3d4/audio/slide-02.wav",
    "durationSeconds": 14.8,
    "timelineShift": {
      "slideId": "slide-02",
      "newDurationSeconds": 15.5,
      "subsequentStartTimesUpdated": true
    }
  }
  ```
- **Sync Rule**: Slide `durationSeconds = max(audioDuration + 0.8, lastAnimationEnd)`.

---

### 2.7. Xuất Bản Bài Giảng (Export Services)

#### `POST /projects/{id}/export`
Khởi tạo background job xuất bản bài giảng.
- **Request Body**:
  ```json
  {
    "type": "mp4" // "mp4" | "pdf" | "pptx"
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "exportId": "exp-998877",
    "projectId": "proj-a1b2c3d4",
    "type": "mp4",
    "status": "pending",
    "createdAt": "2026-10-19T16:10:00Z"
  }
  ```

#### `GET /exports/{id}`
Kiểm tra tiến độ kết xuất và lấy liên kết tải về.
- **Response `200 OK`**:
  ```json
  {
    "exportId": "exp-998877",
    "type": "mp4",
    "status": "running", // "pending" | "running" | "completed" | "failed"
    "progress": 75,
    "downloadUrl": null,
    "error": null
  }
  ```
- Khi hoàn tất (`status: "completed"`):
  ```json
  {
    "exportId": "exp-998877",
    "type": "mp4",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "/storage/projects/proj-a1b2c3d4/exports/lecture_1080p.mp4",
    "error": null
  }
  ```
