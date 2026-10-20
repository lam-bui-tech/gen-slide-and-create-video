# AI Lecture Studio v2 — Chuyển từ Document-first sang Template-first

Playbook cho Claude Code: **prompt + cách giải thích hiện trạng → đích đến + skill/plugin** theo từng giai đoạn.
Prompt viết bằng tiếng Anh. Làm theo thứ tự P0 → P7, mỗi phase một session riêng (`/clear` giữa các phase).

---

## 0. Cách dùng

1. Chạy **P0 trước tiên** (audit + chốt quyết định). Không viết code mới khi chưa có bản đồ hiện trạng (as-is map).
2. Mỗi prompt đã có 3 phần: **Current** (AI đang có gì), **Target** (cần thành gì), **Acceptance** (xong khi nào). Dán kèm block ngữ cảnh ở mục 1.
3. Nếu làm 2 người: gắn nhãn **[A]** (backend/pipeline) và **[B]** (frontend/engine) như bảng ở mục 4; mỗi người một git worktree (`using-git-worktrees`). Vùng chung (`schemas/`, `docs/`) cần cả hai duyệt.
4. Mọi thay đổi schema phải đi kèm **migration cho project cũ** (không làm mất dữ liệu đã có).

---

## 1. Block ngữ cảnh (dán đầu MỌI prompt)

```
Project: "AI Lecture Studio" — a self-hosted tool that helps teachers produce narrated
lecture videos/slides in Vietnamese. Engine: HyperFrames (HTML+CSS+GSAP) for slide
preview, Studio and MP4 rendering. Voice: VieNeu-TTS (Viettel as alternative) behind
a provider interface. LLM: Gemini Flash default + Ollama adapter behind a provider
interface. Document parsing: MarkItDown + python-pptx. Everything is driven by
LessonSceneJSON; AI outputs structured JSON only, never free-form HTML.

CURRENT STATE (v1, document-first, already working end to end):
  upload doc -> fixed 8-question clarification -> LessonOutline -> auto-generated slides
  from 10 hard-coded layouts -> Studio canvas (inline text edit, layout variant switcher,
  GSAP animation presets, undo/redo, autosave) -> per-slide narration + VieNeu audio with
  audio-first duration sync -> export MP4 (hyperframes render) / PDF / image-pack PPTX.
Known problems in v1:
  1. The user does not choose a design. Layouts are hard-coded; there is no template
     library, no categories, no way to create a new template.
  2. Generated slides are often mostly blank and rarely contain images. A console 404
     ("Failed to load resource") appears in the QA report — possibly broken asset paths.
  3. No video insertion, no media recommendations from the lecture content.

TARGET STATE (v2, template-first):
  Template Library (browse/filter by subject, style, effect) -> pick a Template Pack ->
  load content (upload/paste) -> AI fills the pack's slots (asks only what it cannot
  infer) -> media recommendations per slide (image/diagram/chart/video) -> Studio ->
  voice + sync -> export. Plus a Template Builder (drag-and-drop, effects, slot marking,
  video) that saves new templates into the library.

Rules:
- Audit before changing; never rewrite what works (voice sync, export, Studio autosave).
- Backward compatible: existing v1 projects must still open (write a migration).
- Plan Mode first; then implement in small tickets; tests for core logic (tdd).
- Verify HyperFrames behavior from its docs/CLI help and by running small spikes;
  do not assume features (especially video embedding during render).
- If ambiguous, ask me before assuming. Report: files changed, how to run/test, risks.
```

---

## 2. Bảng chuyển đổi (Current → Target)

| Thành phần hiện tại (v1) | Chuyển thành (v2) | Ghi chú migration |
|---|---|---|
| 10 template hard-code (`title-slide`, `concept-explain`...) | **Template Pack mặc định "Basic"** chứa 10 `Layout` | Giữ nguyên giao diện; chỉ bọc thêm metadata + slot |
| `templateId` trên mỗi slide | `packId` (cấp project) + `layoutId` (cấp slide) | Script đổi `templateId` cũ → `layoutId` của pack Basic |
| `elements[]` tự do trong scene | `slotValues{}` (giá trị theo slot) + `elements[]` chỉ cho phần tử tự thêm | Project cũ: giữ `elements[]`, đánh dấu `schemaVersion: 1` |
| `outline_to_hyperframes.js` (mapper cứng) | **Slot filler**: AI điền slot theo schema của layout, validate | Mapper cũ giữ làm fallback |
| 8 câu hỏi cố định | **Clarification thích ứng**: chỉ hỏi phần chưa suy ra được từ tài liệu + pack đã chọn | Bỏ câu hỏi nếu đã có câu trả lời |
| Bước 1 = upload | Bước 1 = **Template Gallery**, upload ở bước 2 | Giữ API upload; đổi thứ tự UI |
| Layout variant switcher (5 bố cục) | Mỗi layout có `variants[]` do người tạo template định nghĩa | Chuyển 5 variant hiện tại thành variants của layout tương ứng |
| Không có media gợi ý | **Media Recommender** (visual_need + ứng viên + chọn 1 chạm) | Chạy sau slot filling |
| Studio chỉnh chữ/ảnh/hiệu ứng | Studio giữ nguyên + thêm: đổi layout trong pack, thay media, ô chat sửa từng slide | Không phá autosave/undo |
| Không có builder | **Template Builder** dùng chung engine canvas của Studio | Tái dùng component kéo thả |
| Ảnh trích từ tài liệu không dùng/không hiển thị | Ảnh trích → kho media của project, có `caption`, `nearText` | Sửa lỗi 404 ở P1 |

**Sơ đồ dữ liệu v2 (phác thảo để AI bám theo, có thể chỉnh sau P0):**

```jsonc
TemplatePack {
  id, name, description, previewVideoUrl,
  tags: { subject: ["toan","van"], style: ["hoc-thuat","tre-em"], effect: ["fade","typewriter"] },
  aspectRatio: "16:9", tokens: { colors, fonts, spacing },
  layouts: Layout[]
}
Layout {
  id, name, purpose,            // concept-explain, quiz, comparison...
  slots: Slot[],                // nơi AI/giáo viên điền nội dung
  decor: Element[],             // phần tử trang trí cố định
  variants: Variant[],          // text-left/image-right, no-image, fullscreen...
  defaultAnimations: Animation[]
}
Slot { id, role: "title|body|list|media|formula|chart|caption",
       accepts: ["text","list","image","video","chart","formula"],
       constraints: { maxChars, maxItems, aspect }, optional: boolean }
SceneSlide(v2) { slideId, layoutId, variantId, slotValues{}, media[], animations[],
                 voice{narration,audioUrl,durationSeconds}, durationSeconds, notes }
MediaCandidate { id, source: "document|diagram|ai-image|stock|upload", url,
                 alt, relevance, license }
```

---

## 3. Skill, plugin, MCP dùng trong dự án v2

| Loại | Tên | Dùng ở |
|---|---|---|
| Skill | `grill-with-docs`, `grilling` | P0: chốt quyết định, ghi ADR |
| Skill | `domain-modeling` | P0/P1: CONTEXT.md, mô hình Pack/Layout/Slot |
| Skill | `improve-codebase-architecture`, `codebase-design` | P0 (audit), P1 (ranh giới module) |
| Skill | `to-spec`, `to-tickets`, `wayfinder` | P0: spec v2, ticket theo phase |
| Skill | `diagnosing-bugs` | P1: lỗi 404/slide trắng; P4/P6 khi render lỗi |
| Skill | `tdd` | Slot filler, media ranking, sync, migration |
| Skill | `ui-ux-pro-max`, `design-system`, `ui-styling`, `frontend-design` | P2 gallery, P5 builder, design token cho pack |
| Skill | `web-artifacts-builder` | Prototype nhanh gallery/builder trước khi vào code thật |
| Skill | `gemini-api-dev` | Slot filling, visual_need, (tùy chọn) ảnh AI |
| Skill | `code-review`, `finishing-a-development-branch`, `handoff`, `retro` | Cuối mỗi ticket/phase |
| Skill | `using-git-worktrees`, `git-guardrails-claude-code`, `setup-pre-commit` | Làm song song 2 người |
| Plugin | `feature-dev` (code-explorer / architect / reviewer) | P0 audit, P2–P5 khi tính năng lớn |
| Plugin | `pr-review-toolkit`, `code-review` | Trước khi merge |
| Plugin | `frontend-design` (chính thức) | UI gallery/builder tránh giao diện mặc định |
| Plugin | `gemini-api` (đã cài) | Các API Gemini cho slot filling/ảnh |
| MCP | `huggingface` | P4: thử model sinh ảnh nếu chọn ảnh AI |
| MCP | `figma` | Nếu bạn thiết kế template trên Figma, đọc UI để dựng layout |
| Hook | RTK (đã có), pre-commit | Giữ nguyên |

Subagent gợi ý: **Explore** (audit, chỉ đọc) cho P0; **Plan** cho mỗi phase; **General** để implement; dùng **Writer/Reviewer tách riêng** cho thay đổi schema.

---

## 4. Phân việc (nếu làm 2 người)

| Phase | [A] Backend / Pipeline | [B] Frontend / Engine |
|---|---|---|
| P0 | Cả hai | Cả hai |
| P1 | Schema v2 + migration + sửa lỗi asset | Bọc 10 layout thành pack Basic |
| P2 | API pack/gallery | UI Gallery + preview |
| P3 | Slot filler + clarification thích ứng | UI nạp nội dung + duyệt kết quả |
| P4 | Media recommender (backend) | UI chọn media 1 chạm |
| P5 | Lưu/load template, validate pack | Template Builder (canvas) |
| P6 | Pipeline media video + render | Video element trong Studio/Builder |
| P7 | Subtitles, pronunciation, chat sửa slide | UI tương ứng |

---

## 5. Các phase

### P0 — Audit hiện trạng & chốt quyết định (làm chung)
Skills/plugins: `feature-dev` (code-explorer), `improve-codebase-architecture`, `grill-with-docs`, `domain-modeling`, `to-spec`, `to-tickets`, `wayfinder`

**P0.1 — As-is map (Explore subagent, read-only)**
```
[context block]
Task: produce docs/AS_IS.md. Do NOT change code.
Explore the repo (scripts/, server/, studio/, templates/, schemas/, tests/, docs/qa) and
document: data flow from upload to export (with file/function names), where the 10
templates are defined, how LessonSceneJSON is created and consumed, how the Studio
saves edits, how audio sync and export work, where extracted images are stored and
how they reach the scene/HTML. List every place that references templateId.
Also reproduce the "mostly blank slides / no images" problem on a sample PPTX and
report root causes with evidence (including the 404 in docs/qa/report.json).
End with: what can be kept unchanged, what must change for template-first.
```

**P0.2 — Quyết định (`grill-with-docs`)**
```
Using docs/AS_IS.md, interview me adversarially, one group at a time, and record ADRs
in docs/adr/. Cover:
- Template Pack vs Layout: is "template" a whole deck theme or a single slide layout?
- Where templates live (files in repo vs DB), versioning, and import/export of packs.
- Slot model: which slot types exist, how AI fills them, how overflow is handled.
- Image sources: extracted-from-document, generated diagrams (SVG/Mermaid), AI images,
  stock (license policy). Which are in the MVP?
- Video in slides: upload-only? trimming? audio ducking under narration? Does
  HyperFrames render embedded video? (propose a spike).
- Builder scope for v2.0: what is in/out.
- Migration policy for existing projects.
```

**P0.3 — Domain + spec + tickets**
```
Update CONTEXT.md with: TemplatePack, Layout, Slot, Variant, MediaCandidate, SlotFiller,
MediaRecommender, TemplateBuilder. Then write docs/SPEC_V2.md (schemas from section 2 of
the playbook, adjusted by the ADRs, plus API changes) and run to-tickets: tracer-bullet
tickets per phase P1–P7, tagged [A]/[B], with blockers. Use wayfinder so the ticket map
survives across sessions.
```

---

### P1 — Mô hình Template/Slot + sửa lỗi nền
Skills: `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`

**P1.1 — Fix blank slides / broken assets first**
```
Current: slides render mostly blank, images rarely appear, and the QA report logs a 404
for a resource. Target: every extracted image is stored, referenced by a stable URL, and
rendered; broken references fail loudly in tests.
Use diagnosing-bugs: reproduce, form hypotheses (asset path, storage URL vs file path,
serving rules in server.js, HTML generation), verify each, then fix the root cause.
Add a test that uploads a PPTX/PDF containing images and asserts the images appear in
the generated scene and respond 200. Add a layout-fill check: warn when a slide uses
less than a configurable share of the canvas.
```

**P1.2 — Schema v2 + migration**
```
Current: scene slides use templateId + free-form elements[]. Target: TemplatePack /
Layout / Slot and SceneSlide v2 as in docs/SPEC_V2.md, with schemaVersion on projects.
Use TDD:
1) JSON Schema as source; generate Pydantic + Zod/TS; add a contract test for drift.
2) Write migrate_v1_to_v2: create pack "basic" from the 10 existing templates (wrap, do
   not redesign), map old templateId -> layoutId, map existing elements to slotValues
   where unambiguous, keep the rest as elements[].
3) Prove with fixtures: open a v1 project, migrate, render, and compare snapshots.
Do not change visual output of existing templates.
```

**P1.3 — Registry**
```
Replace the hard-coded template list with a TemplateRegistry that loads packs from
templates/packs/<packId>/pack.json (+ layouts + assets). Provide list/get/validate.
Each layout validates its slots and declares variants and default animations. Add
tests: invalid pack rejected with clear errors; basic pack passes.
```
Done khi: project v1 cũ mở được qua migration; ảnh hiển thị; pack "Basic" nạp từ registry.

---

### P2 — Template Gallery & luồng mới
Skills/plugins: `ui-ux-pro-max`, `design-system`, `ui-styling`, `frontend-design` (plugin), `web-artifacts-builder`, `tdd`

**P2.1 — Prototype nhanh**
```
Use web-artifacts-builder to prototype the Template Gallery as a single file: grid of
pack cards with animated preview, filters by subject / style / effect, search, "use
this template" button, and a detail drawer listing the pack's layouts. Validate the
interaction before building it into the real app.
```

**P2.2 — Gallery trong app + đổi thứ tự luồng**
```
Current: the first screen is upload. Target: first screen is the Template Gallery;
selecting a pack creates a project with packId, then goes to content loading.
Implement GET /packs (filters), GET /packs/{id} (layouts, tokens, preview), and the UI
following ui-ux-pro-max and design-system guidance. Keep old projects reachable from a
"Projects" list. Pack previews: render a short loop from sample content (cache them).
Tests: filter logic, creating a project from a pack, routing.
```
Done khi: mở app → chọn pack → tạo project; project cũ vẫn mở được.

---

### P3 — Nạp nội dung vào template (Slot filling) + hỏi làm rõ thích ứng
Skills: `gemini-api-dev`, `tdd`, `codebase-design`, `grill-me` (rà câu hỏi)

**P3.1 — Slot filler**
```
Current: the outline mapper decides layout and writes elements. Target: given
DocumentContext + chosen pack + answers, produce a plan: for each lecture slide choose a
layout from the pack (by purpose), then fill that layout's slots with schema-validated
content. Use the LLMProvider with structured output; validate each slotValues against
the layout's slot constraints; on overflow or invalid data, retry with the validation
error, then fall back to splitting content across two slides. Pure functions + tests
with FakeProvider. Never emit HTML.
```

**P3.2 — Clarification thích ứng**
```
Current: 8 fixed questions. Target: infer from DocumentContext and the pack (subject,
audience, style) and ask only what is missing or low-confidence; show inferred values
as "confirm or edit". Keep questions about duration, language, quiz/check-in, voice
only when not inferable. Endpoint returns {inferred, questions}. Tests for inference
and skipping logic.
```
Done khi: chọn pack + upload → hệ thống hỏi ≤ vài câu cần thiết → sinh deck điền đủ slot, không trống.

---

### P4 — Media Recommender (ảnh / sơ đồ / video gợi ý)
Skills/plugins/MCP: `gemini-api-dev`, `tdd`, `diagnosing-bugs`; MCP `huggingface` (nếu chọn ảnh AI)

**P4.1 — Phân tích nhu cầu hình ảnh**
```
For each filled slide, produce visual_need: {type: diagram|photo|chart|video|none,
description, searchQuery, altText, confidence}. Rules: math/science -> prefer diagram,
formula rendering or chart over photos; abstract slides -> none. Structured output only,
validated, with tests on sample slides.
```

**P4.2 — Nguồn ứng viên**
```
Implement MediaSource adapters behind one interface, returning MediaCandidate[]:
1) DocumentImageSource: extracted images ranked by nearText/caption similarity to the
   slide.
2) DiagramSource: generate SVG/Mermaid/charts from slide content (tables -> chart).
3) AIImageSource (optional; config flag): image generation via the chosen provider.
4) UploadSource: teacher-provided files.
Stock sources only after I confirm a license policy (ADR). Each candidate keeps
source, license and alt text. Return 3-4 candidates per slide.
```

**P4.3 — Chọn 1 chạm + layout tự cân bằng**
```
UI: per slide, a media strip with candidates; click to apply into the media slot;
"none" is allowed. If a slide has no media, automatically switch to a variant without
an image so the slide is not empty or lopsided. Track chosen media in scene.media[].
Tests for variant fallback and candidate application.
```
Done khi: phần lớn slide có đề xuất media hợp lý; không còn slide trắng.

---

### P5 — Template Builder (kéo thả)
Skills/plugins: `frontend-design` (plugin), `ui-ux-pro-max`, `design-system`, `ui-styling`, `web-artifacts-builder`, `feature-dev` (architect), `tdd`; MCP `figma` nếu có thiết kế mẫu

```
Current: the Studio edits slides but templates cannot be created. Target: Template
Builder reusing the Studio canvas engine.
Features: add text/list/image/video/shape/icon/chart/formula elements; drag, resize,
align/snap; mark an element as a Slot (choose role, accepted types, constraints) or as
decor; define variants; attach GSAP animation presets with duration/delay/easing and
preview over time; set pack tokens (colors, fonts); save as Layout into a new or
existing pack with tags (subject, style, effect) and a generated preview thumbnail;
validate against the pack schema before saving.
Start with a plan (Plan Mode) and a small tracer-bullet: create one layout end to end
(draw -> mark slots -> save -> appears in the gallery -> usable in a project).
Unit-test the canvas state reducers and pack validation.
```
Done khi: tạo layout mới trong Builder → xuất hiện trong thư viện → dùng được trong project thật.

---

### P6 — Chèn video minh họa
Skills: `diagnosing-bugs`, `tdd`, `code-review`

**P6.1 — Spike (bắt buộc trước khi làm)**
```
Spike only, no production code: determine whether HyperFrames can render an embedded
<video> (local MP4/WebM) into the final MP4 with correct timing, trimming, and mixed
audio (narration + video audio). Check the CLI help/docs and build a 10-second test.
Report: supported/unsupported, required flags, performance, limits, and a recommended
design. If unsupported, propose a fallback (pre-render clip to frames or mux with FFmpeg).
```

**P6.2 — Tính năng**
```
Implement a video element/slot: upload MP4/WebM (size/format validation), trim start/
end, mute or duck under narration, loop option, poster frame. Video slides' duration is
max(narration, trimmed clip) per the audio-first rule. Preview in the Studio, include in
MP4 export; in PDF/PPTX export use the poster frame. Link-based embeds (e.g. YouTube)
are out of scope unless the spike proves they can be rendered. Tests: duration
calculation, export contains the clip (ffprobe), poster fallback in PDF.
```

---

### P7 — Bổ sung giá trị
Skills: `tdd`, `gemini-api-dev`, `ui-styling`

**P7.1 — Phụ đề**
```
Generate SRT/VTT from narration with timings, show in preview, optional burn-in for MP4,
and export the file separately.
```
**P7.2 — Đọc công thức & thuật ngữ tiếng Việt**
```
Add a pronunciation layer before TTS: dictionary (term -> spoken form), rules for
reading math (x², √, fractions, units), per-project overrides in the UI, and a quick
"preview this phrase" button. Test with a math lesson sample; keep VieNeu/Viettel
behind the TTSProvider interface.
```
**P7.3 — Chat sửa từng slide**
```
Add a chat box per slide: natural-language instructions ("shorter", "add an example",
"make it simpler for grade 6") produce a validated patch to slotValues (never raw
HTML), show a diff, and apply with undo. Regenerate narration only on user request.
```
**P7.4 — Chất lượng bài giảng**
```
Add a review panel per deck: flags empty/overfull slides, missing alt text, narration
much longer than visible content, and duration extremes. No auto-fix without consent.
```

---

## 6. Điểm kiểm tra tích hợp (gate) & cuối phase

| Gate | Điều kiện |
|---|---|
| G1 (sau P1) | Project v1 mở được qua migration; ảnh hiển thị; pack Basic chạy từ registry |
| G2 (sau P2–P3) | Chọn pack → nạp tài liệu → deck điền đủ slot → vẫn xuất MP4/PDF được |
| G3 (sau P4) | Gợi ý media đúng ngữ cảnh; không còn slide trắng trên bộ mẫu |
| G4 (sau P5) | Template tạo bằng Builder dùng được end-to-end |
| G5 (sau P6) | Video chèn vào bài giảng xuất ra MP4 đúng thời lượng |

**Prompt kiểm tích hợp**
```
Run an end-to-end check for gate <Gx> using real services (no fixtures). List each
mismatch (field names, types, timing, error codes), tag [A]/[B], minimal repro. Do not
edit the other person's folders.
```

**Cuối mỗi phase** (`code-review`, `pr-review-toolkit`, `finishing-a-development-branch`, `retro`, `handoff`):
```
Audit this phase: backward compatibility with v1 projects, no hand-written per-slide
HTML, providers only via interfaces, schemas in sync (contract test), and test coverage
of core logic. Output a prioritized fix list and a handoff doc (<= 80 lines).
```

---

## 7. Rủi ro & điểm cần quyết định

1. **Video trong render MP4**: chưa biết HyperFrames hỗ trợ đến đâu → làm spike P6.1 sớm (có thể chạy song song với P2).
2. **Ảnh AI/stock**: cần chính sách giấy phép trước khi bật nguồn bên ngoài.
3. **Phạm vi Builder**: dễ phình to. Giữ v2.0 ở mức tạo layout + slot + hiệu ứng, bỏ qua timeline video phức tạp.
4. **Chất lượng slot filling**: nội dung dài làm tràn ô → cần quy tắc tách slide và kiểm tra overflow.
5. **Đọc công thức tiếng Việt**: TTS dễ sai với ký hiệu toán → cần từ điển phát âm (P7.2).
6. **PPTX dạng ảnh** vẫn không chỉnh sửa được; xác nhận lại có chấp nhận ở v2 không.
