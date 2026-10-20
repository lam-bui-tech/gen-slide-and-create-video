# Đặc Tả Kỹ Thuật Hệ Thống AI Lecture Studio v2 (Template-First)

**Tài liệu:** `docs/SPEC_V2.md`  
**Phiên bản:** 2.0.0  
**Ngày phê duyệt:** 2026-10-20  
**Căn cứ kỹ thuật:** `docs/AS_IS.md`, `docs/adr/0006-template-first-architecture-and-slot-model.md`, `prompt v2.md`

---

## 1. Tổng Quan Kiến Trúc v2

Hệ thống chuyển đổi từ luồng **Document-First** (v1: Upload -> Clarify -> AI sinh slide tự do vào 10 template cứng) sang luồng **Template-First** (v2: Chọn Template Pack -> Upload tài liệu -> AI điền Slot -> Gợi ý Media 1-chạm -> Studio -> Xuất bản).

```
[Giáo viên] 
    │
    ▼ (Bước 1)
[Template Gallery] ──(chọn packId)──► [Tạo Project v2 {packId, schemaVersion: 2}]
    │
    ▼ (Bước 2)
[Nạp Tài Liệu] (Upload file hoặc paste text) ──► [DocumentIngestionService]
    │                                                    │
    ▼ (Bước 3)                                           ▼
[Clarification Thích Ứng] ◄──(suy diễn thông minh)────── [DocumentContext.json]
    │
    ▼ (Bước 4)
[SlotFiller Engine (LLM)] ──(điền slot theo Layout)────► [SceneSlide v2 (slotValues)]
    │                                                    │ (Auto-retry nếu tràn text)
    ▼ (Bước 5)                                           │
[MediaRecommender] ◄──────(visual_need + ranking)────────┘
    │  (Đề xuất 3-4 MediaCandidate: ảnh trích xuất, sơ đồ SVG, biểu đồ)
    ▼
[Studio Canvas Editor] (Biên tập inline, đổi variant, đổi media, chỉnh voice)
    │
    ▼ (Bước 6)
[Audio-First TTS Sync] (VieNeu-TTS / Viettel) ──► slide.duration = max(audio, video)
    │
    ▼ (Bước 7)
[Export Pipeline] ──► MP4 (HyperFrames render) / PDF (Chrome 1920x1080) / PPTX (image-pack)
```

---

## 2. Đặc Tả Dữ Liệu v2 (Data Schemas)

### 2.1. TemplatePack Schema
Lưu tại: `templates/packs/<packId>/pack.json`

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TemplatePack",
  "type": "object",
  "required": ["id", "name", "description", "aspectRatio", "tokens", "tags", "layouts"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9_-]+$" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "previewVideoUrl": { "type": "string" },
    "aspectRatio": { "type": "string", "enum": ["16:9"], "default": "16:9" },
    "tags": {
      "type": "object",
      "required": ["subject", "style", "effect"],
      "properties": {
        "subject": {
          "type": "array",
          "items": { "type": "string", "enum": ["toan-tin", "khoa-hoc-tu-nhien", "xa-hoi-nhan-van", "ngoai-ngu", "kinh-te-quan-tri", "tong-hop"] }
        },
        "style": {
          "type": "array",
          "items": { "type": "string", "enum": ["hoc-thuat-nghiem-tuc", "hien-dai-toi-gian", "sinh-dong-tre-trung", "cong-nghe-tuong-lai"] }
        },
        "effect": {
          "type": "array",
          "items": { "type": "string", "enum": ["nhe-nhang-fade", "nang-dong-kinetic", "chu-danh-may-typewriter"] }
        }
      }
    },
    "tokens": {
      "type": "object",
      "required": ["colors", "fonts", "spacing"],
      "properties": {
        "colors": {
          "type": "object",
          "properties": {
            "primary": { "type": "string" },
            "primaryHover": { "type": "string" },
            "accent": { "type": "string" },
            "bgCanvas": { "type": "string" },
            "bgCard": { "type": "string" },
            "textMain": { "type": "string" },
            "textSub": { "type": "string" },
            "border": { "type": "string" }
          }
        },
        "fonts": {
          "type": "object",
          "properties": {
            "heading": { "type": "string", "default": "Be Vietnam Pro, sans-serif" },
            "body": { "type": "string", "default": "Be Vietnam Pro, sans-serif" },
            "code": { "type": "string", "default": "JetBrains Mono, monospace" }
          }
        },
        "spacing": { "type": "object" }
      }
    },
    "layouts": {
      "type": "array",
      "items": { "$ref": "#/definitions/Layout" }
    }
  }
}
```

### 2.2. Layout Schema
```jsonc
{
  "Layout": {
    "type": "object",
    "required": ["id", "name", "purpose", "slots", "variants"],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "purpose": {
        "type": "string",
        "enum": ["title", "concept-explain", "bullet-breakdown", "image-explain", "comparison", "timeline", "formula-explain", "quiz", "summary", "custom"]
      },
      "slots": {
        "type": "array",
        "items": { "$ref": "#/definitions/Slot" }
      },
      "decor": {
        "type": "array",
        "items": { "$ref": "#/definitions/DecorElement" }
      },
      "variants": {
        "type": "array",
        "items": { "$ref": "#/definitions/Variant" }
      },
      "defaultAnimations": {
        "type": "array",
        "items": { "$ref": "#/definitions/AnimationPreset" }
      }
    }
  }
}
```

### 2.3. Slot Schema
```jsonc
{
  "Slot": {
    "type": "object",
    "required": ["id", "role", "accepts"],
    "properties": {
      "id": { "type": "string" },
      "role": {
        "type": "string",
        "enum": ["title", "subtitle", "badge", "body", "bullets", "media", "diagram", "formula", "quiz", "timeline"]
      },
      "accepts": {
        "type": "array",
        "items": { "type": "string", "enum": ["text", "list", "image", "video", "diagram", "chart", "formula"] }
      },
      "constraints": {
        "type": "object",
        "properties": {
          "maxChars": { "type": "integer" },
          "maxItems": { "type": "integer" },
          "aspectRatio": { "type": "string" }
        }
      },
      "optional": { "type": "boolean", "default": false },
      "defaultValue": { "type": ["string", "object", "array"] }
    }
  }
}
```

### 2.4. SceneSlide v2 (Bên trong LessonSceneJSON v2)
```jsonc
{
  "SlideSceneV2": {
    "type": "object",
    "required": ["slideId", "layoutId", "slotValues", "durationSeconds", "voice"],
    "properties": {
      "slideId": { "type": "string" },
      "layoutId": { "type": "string" },
      "variantId": { "type": "string", "default": "default" },
      "slotValues": {
        "type": "object",
        "description": "Key-value mapping: slotId -> content conforming to slot constraints"
      },
      "media": {
        "type": "array",
        "items": { "$ref": "#/definitions/MediaCandidate" }
      },
      "elements": {
        "type": "array",
        "description": "Các phần tử do giáo viên tự vẽ thêm qua Builder/Studio (decor hoặc custom)"
      },
      "animations": {
        "type": "array",
        "items": { "$ref": "#/definitions/AnimationPreset" }
      },
      "voice": {
        "type": "object",
        "required": ["narration", "provider", "audioUrl", "durationSeconds"],
        "properties": {
          "narration": { "type": "string" },
          "provider": { "type": "string", "enum": ["vieneu", "viettel", "fake"] },
          "voiceId": { "type": "string" },
          "audioUrl": { "type": "string" },
          "durationSeconds": { "type": "number" }
        }
      },
      "durationSeconds": { "type": "number" },
      "notes": { "type": "string" }
    }
  }
}
```

### 2.5. MediaCandidate Schema
```jsonc
{
  "MediaCandidate": {
    "type": "object",
    "required": ["id", "source", "url", "type"],
    "properties": {
      "id": { "type": "string" },
      "source": { "type": "string", "enum": ["document", "diagram", "chart", "upload", "ai-image"] },
      "type": { "type": "string", "enum": ["image", "video", "diagram"] },
      "url": { "type": "string" },
      "alt": { "type": "string" },
      "relevance": { "type": "number", "minimum": 0, "maximum": 1 },
      "license": { "type": "string", "default": "educational-fair-use" }
    }
  }
}
```

---

## 3. Danh Sách API v2 (Endpoints Specification)

| Phương thức | Endpoint | Chức năng | Phụ trách |
|---|---|---|---|
| `GET` | `/packs` | Lấy danh sách Template Packs (hỗ trợ filter: `subject`, `style`, `effect`) | [A] Backend |
| `GET` | `/packs/{id}` | Lấy chi tiết Pack, danh sách Layouts, Design Tokens và link preview | [A] Backend |
| `POST` | `/packs` | Tạo/lưu Template Pack mới (dùng cho Template Builder) | [A] Backend |
| `POST` | `/projects` | Khởi tạo project mới với `packId` đã chọn (thay vì upload trước) | [A] Backend |
| `POST` | `/projects/{id}/ingest` | Tải lên tài liệu (PPTX, PDF, DOCX, MD) -> sinh `DocumentContext` | [A] Backend |
| `GET` | `/projects/{id}/clarify` | Lấy danh sách thông tin đã tự suy diễn + câu hỏi cần làm rõ | [A] Backend |
| `POST` | `/projects/{id}/clarify` | Gửi câu trả lời làm rõ + kích hoạt SlotFiller sinh Scene v2 | [A] Backend |
| `GET` | `/projects/{id}/media-recommendations/{slideId}` | Phân tích `visual_need` và trả về 3-4 `MediaCandidate` | [A] Backend |
| `POST` | `/projects/{id}/media-upload` | Upload ảnh/video cục bộ cho slide (hỗ trợ MP4/WebM trim) | [A] Backend |
| `GET` | `/storage/projects/{id}/images/{filename}` | Phục vụ static ảnh bóc tách (Sửa lỗi 404 v1) | [A] Backend |
| `GET` | `/storage/projects/{id}/videos/{filename}` | Phục vụ static video đã tải lên | [A] Backend |
| `PUT` | `/projects/{id}/scene` | Autosave LessonSceneJSON v2 từ Studio | [A] Backend |
| `POST` | `/projects/{id}/synthesize` | Sinh VieNeu-TTS và đồng bộ Audio-first timeline | [A] Backend |
| `POST` | `/exports/{id}` | Xuất MP4 / PDF / PPTX | [A] Backend |

---

## 4. Chiến Lược Migration (`migrate_v1_to_v2`)

Hàm chuyển đổi thuần túy `migrateV1ToV2(projectV1)`:
1. Nếu `project.schemaVersion >= 2` và có `packId`: giữ nguyên.
2. Nếu không có `packId` hoặc `schemaVersion === 1`:
   - Gán `packId = "basic"`.
   - Gán `schemaVersion = 2`.
   - Duyệt qua từng slide:
     - `layoutId = slide.templateId`.
     - Chuyển đổi các phần tử trong `slide.elements[]` sang `slotValues{}`:
       - `badge` -> `slotValues.badge`
       - `title` -> `slotValues.title`
       - `text` / `quote` -> `slotValues.body`
       - `bullet-list` -> `slotValues.bullets`
       - `image` -> gán URL vào `slotValues.media`
       - `formula` -> `slotValues.formula`
       - `quiz-block` -> `slotValues.quiz`
       - `timeline-step` -> `slotValues.timeline`
     - Các phần tử không khớp slot giữ lại trong `slide.elements[]` (decor/custom).
3. Hỗ trợ chạy in-memory trong backend & Studio, và cung cấp script batch `scripts/migrate_v1_to_v2.py`.

---

## 5. Kế Hoạch Triển Khai Theo Phase & Tracer Tickets

### Phase P1 — Mô hình Template/Slot + Sửa lỗi nền (Fix Foundation)
- **TICKET-P1.1 [A] (Bắt buộc trước)**: Sửa dứt điểm lỗi 404 static images trong FastAPI `server/api_service.py` và Node `server.js`. Xóa bỏ fallback ảo `sample/images/philosophy_intro.png`. Viết test upload PPTX có ảnh và assert ảnh trả về mã 200.
- **TICKET-P1.2 [A]**: Cập nhật JSON Schema (`lesson_scene.json`, `template_pack.json`), Pydantic models và TypeScript types. Viết test chống lệch chuẩn (contract drift test).
- **TICKET-P1.3 [A]**: Viết module `migrate_v1_to_v2` (Python & JS) và fixtures test snapshot đảm bảo project v1 mở ra không bị méo lệch giao diện.
- **TICKET-P1.4 [B]**: Đóng gói 10 layout hiện tại thành **Template Pack mặc định "Basic"** (`templates/packs/basic/pack.json`).
- **TICKET-P1.5 [B]**: Xây dựng `TemplateRegistry` nạp packs từ thư mục `templates/packs/` (hỗ trợ list, get, validate).
*Gate G1: Project v1 cũ mở được qua migration; ảnh hiển thị 100% không 404; pack Basic nạp thành công từ Registry.*

---

### Phase P2 — Template Gallery & Đổi thứ tự luồng (User Flow v2)
- **TICKET-P2.1 [B]**: Tạo prototype Template Gallery nhanh bằng `web-artifacts-builder` để duyệt trải nghiệm tìm kiếm, lọc theo `subject`, `style`, `effect` và xem trước mẫu.
- **TICKET-P2.2 [A]**: Xây dựng API `GET /packs` (kèm filter query) và `GET /packs/{id}` trong FastAPI.
- **TICKET-P2.3 [B]**: Tích hợp màn hình Template Gallery làm bước đầu tiên khi vào Studio, lưu `packId` vào project mới, hiển thị danh sách project gần đây.
*Gate G2a: Người dùng mở ứng dụng -> chọn Pack -> tạo Project thành công.*

---

### Phase P3 — Nạp nội dung vào Template (SlotFiller) + Clarification Thích Ứng
- **TICKET-P3.1 [A]**: Xây dựng `AdaptiveClarificationService`: phân tích `DocumentContext` và `pack.tokens` để suy diễn chủ đề, đối tượng người học, chỉ hỏi lại khi độ tin cậy < 80% hoặc chọn giọng đọc/quiz.
- **TICKET-P3.2 [A]**: Xây dựng `SlotFillerEngine`: nhận context tài liệu và schema của layout đã chọn, điền slot thông qua structured output LLM. Tích hợp auto-retry loop tóm tắt khi tràn slot (`maxChars`, `maxItems`).
- **TICKET-P3.3 [B]**: Cập nhật UI Studio tiếp nhận tài liệu sau khi chọn Pack, hiển thị màn hình xác nhận thông tin ngắn gọn 1-chạm và render slide điền đủ slot.
*Gate G2b: Chọn pack + upload tài liệu -> hỏi <= 2 câu cần thiết -> sinh deck điền đầy đủ slot, không còn slide trắng.*

---

### Phase P4 — Media Recommender (Gợi ý ảnh / Sơ đồ / Biểu đồ)
- **TICKET-P4.1 [A]**: Xây dựng module phân tích `visual_need` trên từng slide (xác định nhu cầu: diagram, chart, photo, video, hoặc none).
- **TICKET-P4.2 [A]**: Xây dựng 3 `MediaSource` adapters: `DocumentImageSource` (ảnh bóc tách được xếp hạng độ liên quan), `DiagramSource` (sinh sơ đồ SVG/Mermaid/Chart.js từ bảng số liệu), `UploadSource`.
- **TICKET-P4.3 [B]**: Xây dựng Media Strip UI ở thanh bên Studio: hiển thị 3-4 ứng viên gợi ý cho mỗi slide, bấm chọn 1-chạm để thay thế vào slot media. Tự động đổi sang variant `no-image` nếu slide không chọn media.
*Gate G3: Slide có đề xuất media đúng ngữ cảnh bài học; không còn slide trống lác.*

---

### Phase P5 — Template Builder (Kéo thả tạo Layout)
- **TICKET-P5.1 [B]**: Tái sử dụng Canvas Studio: chế độ "Builder Mode" cho phép kéo thả, căn chỉnh các khối Text, Card, Image, Video, Shape.
- **TICKET-P5.2 [B]**: Chức năng đánh dấu phần tử: chọn vai trò `role` thành Slot hoặc Decor, gán ràng buộc (`maxChars`, `accepts`), gán preset animation GSAP.
- **TICKET-P5.3 [A]**: API `POST /packs/{id}/layouts` lưu Layout mới thành file JSON chuẩn hóa vào pack, tự động sinh ảnh preview thumbnail.
*Gate G4: Tạo layout mới trong Builder -> xuất hiện ngay trong thư viện -> dùng được trong bài giảng thật.*

---

### Phase P6 — Chèn Video Minh Họa
- **TICKET-P6.1 [A/B]**: Spike test kiểm chứng HyperFrames render `<video>` local MP4 với `--video-frame-format` và `data-media-start`.
- **TICKET-P6.2 [A]**: API upload video cục bộ (`storage/projects/{id}/videos/`), trích xuất poster frame tự động bằng FFmpeg/Canvas cho xuất PDF/PPTX.
- **TICKET-P6.3 [B]**: Component video player trên Canvas Studio: thanh trượt chọn điểm cắt (`trimStart`, `trimEnd`), cờ mute hoặc ducking âm lượng dưới narration.
*Gate G5: Slide chứa video clip xuất ra video MP4 đồng bộ chuẩn thời lượng và âm thanh.*

---

### Phase P7 — Bổ Sung Giá Trị Sư Phạm
- **TICKET-P7.1 [A]**: Tạo phụ đề SRT/VTT từ timeline narration, hỗ trợ burn-in vào video MP4.
- **TICKET-P7.2 [A]**: Lớp chuẩn hóa phát âm tiếng Việt (từ điển thuật ngữ chuyên ngành + quy tắc đọc công thức toán học $x^2, \sqrt{x}, \frac{a}{b}$).
- **TICKET-P7.3 [B]**: Ô chat AI sửa từng slide: nhận yêu cầu ngôn ngữ tự nhiên ("ngắn lại", "cho thêm ví dụ") -> patch trực tiếp vào `slotValues` có kiểm định.
- **TICKET-P7.4 [B]**: Bảng kiểm tra chất lượng sư phạm (cảnh báo slide quá tải chữ, thời lượng đọc quá nhanh/quá chậm).
