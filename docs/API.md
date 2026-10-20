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

### 2.0. Quản Lý Template Packs (v2)

#### `GET /packs`
Lấy danh sách các Template Pack có sẵn trên hệ thống, hỗ trợ lọc theo thẻ phân loại sư phạm và thị giác.
- **Query Parameters**:
  - `subject` (string, tùy chọn): Lọc theo môn học (`toan-tin`, `khoa-hoc-tu-nhien`, `xa-hoi-nhan-van`, `ngoai-ngu`, `kinh-te-quan-tri`, `tong-hop`).
  - `style` (string, tùy chọn): Lọc theo phong cách (`hoc-thuat-nghiem-tuc`, `hien-dai-toi-gian`, `sinh-dong-tre-trung`, `cong-nghe-tuong-lai`).
  - `effect` (string, tùy chọn): Lọc theo hiệu ứng GSAP (`nhe-nhang-fade`, `nang-dong-kinetic`, `chu-danh-may-typewriter`).
- **Response `200 OK`**: Danh sách `TemplatePack` (xem [schemas/template_pack.json](file:///c:/Users/OS/Downloads/project/my-presentation/schemas/template_pack.json)).

#### `GET /packs/{id}`
Lấy chi tiết một Template Pack bao gồm bảng Design Tokens và danh sách Layouts sư phạm cùng các Slots.
- **Response `200 OK`**: Đối tượng `TemplatePack` đầy đủ.
- **Errors**: `404 NOT_FOUND` nếu `id` không tồn tại.

#### `POST /packs`
Tạo hoặc đăng ký một Template Pack mới vào filesystem (`templates/packs/{id}/pack.json`).
- **Request Body**: Đối tượng `TemplatePack` hợp lệ theo schema v2.
- **Response `201 Created`**: Đối tượng `TemplatePack` đã lưu.
- **Errors**: `403 READ_ONLY_PACK` (khi cố gắng ghi đè pack `basic`), `422 INVALID_PACK`.

#### `POST /packs/{id}/layouts` (P5.3 - Builder Save Layout)
Lưu layout mới được thiết kế từ Template Builder vào Template Pack chỉ định. Kiểm tra tính duy nhất của `layout.id`, chống path traversal, và ngăn chặn sửa đổi pack `basic` mặc định.
- **Request Body**: Đối tượng `Layout` hợp lệ theo schema v2.
- **Response `201 Created`**: Đối tượng `TemplatePack` đã được cập nhật kèm layout mới.
- **Errors**: `403 READ_ONLY_PACK` (không cho phép sửa pack `basic`), `409 DUPLICATE_LAYOUT_ID`, `422 INVALID_LAYOUT`.

---

### 2.1. Quản lý Dự án (Projects)

#### `POST /projects`
Tạo một bài giảng mới với thiết kế gắn liền với một Template Pack cụ thể.
- **Request Body**:
  ```json
  {
    "title": "Tên bài giảng (tùy chọn)",
    "packId": "basic"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "projectId": "proj-a1b2c3d4",
    "title": "Bài giảng mới",
    "packId": "basic",
    "currentStep": "upload",
    "createdAt": "2026-10-19T16:00:00Z"
  }
  ```
- **Errors**: `404 PACK_NOT_FOUND` nếu `packId` chỉ định không tồn tại trên hệ thống.

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
Gửi câu trả lời xác nhận từ giảng viên (v1).
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

#### `GET /projects/{id}/clarify` (v2 - Adaptive Clarification)
Phân tích ngữ cảnh sư phạm thông minh từ `DocumentContext` và Template Pack đã chọn ở Bước 1. Suy diễn sẵn các thuộc tính (`style`, `language`, `subject`, `targetAudience`, `durationMinutes`). Chỉ sinh câu hỏi khi độ tin cậy < 0.8 kèm 2 lựa chọn sư phạm cốt lõi (giọng đọc VieNeu và bài kiểm tra trắc nghiệm check-in).
- **Response `200 OK`**:
  ```json
  {
    "inferred": [
      { "key": "style", "value": "hoc-thuat-nghiem-tuc", "confidence": 1.0 },
      { "key": "language", "value": "vi", "confidence": 0.95 },
      { "key": "targetAudience", "value": "Sinh viên đại học", "confidence": 0.88 },
      { "key": "durationMinutes", "value": 15, "confidence": 0.85 }
    ],
    "questions": [
      {
        "id": "voiceId",
        "question": "Giọng đọc thuyết minh trí tuệ nhân tạo (VieNeu)?",
        "type": "single-choice",
        "options": ["MyDuyen", "NamKhoi"],
        "suggestedAnswer": "MyDuyen"
      },
      {
        "id": "includeQuiz",
        "question": "Thêm câu hỏi trắc nghiệm tương tác / check-in cuối bài giảng?",
        "type": "boolean",
        "options": [true, false],
        "suggestedAnswer": true
      }
    ]
  }
  ```

#### `POST /projects/{id}/clarify` (v2 - Save Answers)
Lưu câu trả lời làm rõ sư phạm, cập nhật trạng thái dự án sang `clarified` và kích hoạt bước tiếp theo.
- **Request Body**:
  ```json
  {
    "voiceId": "MyDuyen",
    "includeQuiz": true,
    "targetAudience": "Sinh viên đại học"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "clarified",
    "answers": { ... }
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

### 2.5.1. Khuyến Nghị & Tải Lên Đa Phương Tiện (Media Recommendations & Upload - P4.1, P4.2)

#### `POST /projects/{id}/media-upload`
Tải lên tệp hình ảnh (.png, .jpg, .webp, .svg) hoặc video (.mp4, .webm) từ giảng viên và lưu vào kho lưu trữ của dự án.
- **Content-Type**: `multipart/form-data`
- **Response `201 Created`**:
  ```json
  {
    "id": "up-chart.svg",
    "source": "upload",
    "type": "image",
    "url": "/storage/projects/proj-a1b2c3d4/images/chart.svg",
    "alt": "chart.svg",
    "relevance": 1.0,
    "license": "teacher-upload"
  }
  ```

#### `GET /projects/{id}/media-recommendations/{slideId}`
Phân tích nhu cầu thị giác `visual_need` (diagram, chart, photo, video, none) của slide và xếp hạng 3-4 ứng viên phù hợp nhất từ 3 nguồn: DocumentImageSource (ảnh gốc từ tài liệu), DiagramSource (sơ đồ SVG/Mermaid tự sinh), và UploadSource (ảnh giáo viên tải lên).
- **Response `200 OK`**:
  ```json
  {
    "visualNeed": {
      "type": "diagram",
      "description": "Sơ đồ khối thể hiện quy trình hoặc cấu trúc liên kết",
      "searchQuery": "diagram quy trình",
      "altText": "Sơ đồ minh họa",
      "confidence": 0.88
    },
    "candidates": [
      {
        "id": "img_01",
        "source": "document",
        "type": "image",
        "url": "/storage/projects/proj-a1b2c3d4/images/matrix.png",
        "alt": "matrix.png",
        "relevance": 0.95,
        "license": "document-original"
      },
      {
        "id": "diag-slide-01",
        "source": "diagram",
        "type": "diagram",
        "url": "/storage/projects/proj-a1b2c3d4/images/diagram_slide-01.svg",
        "alt": "Sơ đồ quy trình",
        "relevance": 0.88,
        "license": "ai-generated-svg"
      }
    ]
  }
  ```

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

#### `POST /projects/{id}/slides/{slideId}/chat` (P7.3-API)
Chỉnh sửa nội dung từng slide bằng ngôn ngữ tự nhiên thông qua AI. AI chỉ cập nhật và trả về JSON patch trên `slotValues` (tuyệt đối không can thiệp HTML), tính sẵn `diff` và `explanation` để giao diện Studio hiển thị trực quan. **Không tự động lưu đĩa** cho đến khi giảng viên quyết định lưu thông qua `PUT /projects/{id}/scene`.
- **Request Body**:
  ```json
  {
    "instruction": "Hãy rút gọn tiêu đề thành 'Triết học Mác - Lênin' và bổ sung ví dụ thực tế vào bullets."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "slideId": "slide-01",
    "patch": {
      "title": "Triết học Mác - Lênin",
      "bullets": [ ... ]
    },
    "diff": {
      "title": { "from": "Khái luận Triết học dài dòng...", "to": "Triết học Mác - Lênin" }
    },
    "explanation": "Đã rút gọn tiêu đề slide và bổ sung ví dụ thực tiễn."
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

#### `POST /preview-pronunciation`
Xem trước dạng phát âm tiếng Việt chuẩn hóa (chuẩn hóa ký hiệu toán học, số mũ, căn bậc hai, phân số, đơn vị, chữ Hy Lạp và thuật ngữ chuyên ngành) trước khi gửi qua VieNeu-TTS.
- **Request Body**:
  ```json
  {
    "text": "Cho hàm số f(x) = x² + 2x, với x ∈ [0, 10].",
    "subject": "toan-tin",
    "overrides": {
      "f(x)": "f của x"
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "original": "Cho hàm số f(x) = x² + 2x, với x ∈ [0, 10].",
    "spoken": "Cho hàm số f của x = x bình phương + 2x, với x thuộc [0, 10].",
    "subject": "toan-tin"
  }
  ```

---

### 2.7. Phụ Đề Bài Giảng (Subtitles - P7.1)

#### `GET /projects/{id}/subtitles.srt`
Xuất phụ đề bài giảng định dạng SRT chuẩn (UTF-8 có dấu tiếng Việt), thời gian đơn điệu, không chồng lấn, ngắt dòng dễ đọc.
- **Response `200 OK`**: File nội dung `text/plain; charset=utf-8`.

#### `GET /projects/{id}/subtitles.vtt`
Xuất phụ đề bài giảng định dạng WebVTT cho trình duyệt web và video player HTML5.
- **Response `200 OK`**: File nội dung `text/vtt; charset=utf-8`.

#### `GET /projects/{id}/subtitles?format=srt|vtt`
Endpoint hợp nhất nhận query param `format` (mặc định `srt`).

---

### 2.8. Xuất Bản Bài Giảng (Export Services)

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
