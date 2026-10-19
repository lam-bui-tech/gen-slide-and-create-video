# AI Lecture Studio (HyperFrames-Native) — Prompt Playbook cho 2 người

Dựa trên `plan.md` (HyperFrames là engine duy nhất: slide + Studio + MP4).
Prompt viết bằng tiếng Anh để dán vào Claude Code. Mỗi người chạy agent của mình trong **worktree riêng**.

**Giả định (sửa nếu sai):** repo hiện có `scripts/pptx_to_lecture.py`, `scripts/synthesize_slide.py`, `scripts/build_hyperframes.js`, `studio.html`, `server.js`. Mình chia thêm các thư mục `schemas/`, `templates/`, `fixtures/`, `docs/`.

---

## 0. Phân vai

| | **Người A — Pipeline & Export** | **Người B — Engine & Studio** |
|---|---|---|
| Phụ trách | Ingestion, clarification, outline (LLM), TTS, audio-sync, export (MP4/PDF/PPTX), API/server | 10 template HyperFrames, mapper, Studio canvas, layout variant, animation preset, preview |
| Sở hữu thư mục | `scripts/` (Python), `server.js` / `server/`, `storage/`, `tests/pipeline/` | `templates/`, `studio.html` / `studio/`, `scripts/build_hyperframes.js`, `outline_to_hyperframes.js`, `tests/engine/` |
| Skill chính | `gemini-api-dev`, `tdd`, `diagnosing-bugs`, `codebase-design` | `frontend-design`, `ui-ux-pro-max`, `design-system`, `ui-styling`, `web-artifacts-builder`, `tdd` |
| **Chung (cả hai duyệt PR)** | `schemas/` (LessonSceneJSON, DocumentContext, LessonOutline), `docs/API.md`, `fixtures/` | |

**Quy tắc vàng:** không ai sửa thư mục của người kia. Cần đổi thì dừng lại, mở issue/PR vào vùng chung.

**Thiết lập worktree (mỗi người một lần)**

```bash
git worktree add ../studio-A -b feat/a-pipeline
git worktree add ../studio-B -b feat/b-engine
# A: cd ../studio-A && claude     B: cd ../studio-B && claude
```

Skill: `using-git-worktrees`, `git-guardrails-claude-code`, `setup-pre-commit`, `finishing-a-development-branch`, `resolving-merge-conflicts` (khi có conflict), `handoff` (cuối phiên).
Merge vào `main` sau **mỗi ticket**, rebase hàng ngày. Phiên mới: `/clear`.

---

## 1. Block ngữ cảnh (dán đầu MỌI prompt)

```
Project: "AI Lecture Studio" — teachers upload PPTX/PDF/DOCX/MD; the system analyzes
the document, asks pedagogical clarifying questions, generates a LessonOutline,
generates slides from 10 templates, lets the teacher edit in a WYSIWYG Studio,
attaches Vietnamese voice-over, and exports MP4 / PDF / PPTX.

Architecture decisions (final):
- HyperFrames (HTML5 + CSS + GSAP) is the single engine for slides, Studio preview
  and MP4 rendering. No Presenton, no Revideo.
- Every slide is driven only by LessonSceneJSON (schemas/ is the source of truth).
- AI only outputs structured JSON, validated by schema; never hand-written HTML.
- Audio-first sync: real TTS audio duration decides slide durationSeconds; GSAP
  timelines scale accordingly.
- LLM (Gemini Flash default, Ollama adapter) and TTS (VieNeu v3 Turbo / Viettel)
  sit behind provider interfaces.
- Existing assets to build on, not rewrite: scripts/pptx_to_lecture.py,
  scripts/synthesize_slide.py, scripts/build_hyperframes.js, studio.html, server.js.

Rules: read existing code and the HyperFrames docs/CLI help before writing code; do
not assume HyperFrames APIs. Plan first (Plan Mode), then implement. Show: files
changed, how to run/test, risks, open decisions. If ambiguous, ask me.
```

**Block phân vùng (thêm vào prompt của từng người)**

```
Ownership: I am Person <A|B>. Only modify files in my owned folders: <list>.
Shared folders (schemas/, docs/API.md, fixtures/) require a separate small PR that
both of us review. If a task needs a change outside my folders, stop and tell me
what and why instead of editing.
```

---

## 2. Sprint 0 — Làm CHUNG (1 buổi, trước khi tách nhánh)

Mục tiêu: đóng băng hợp đồng để hai người làm song song không chờ nhau.
Skill: `grill-with-docs` → `domain-modeling` → `to-spec` → `to-tickets`.

**Prompt S0.1 — Chốt các điểm mở (`grill-with-docs`)**

```
[context block]
Interview me adversarially about open decisions in plan.md, one group at a time,
and record answers as ADRs. Cover at least:
- Backend split: Python (ingestion, LLM, TTS) vs Node (HyperFrames build/render,
  server.js). What is the boundary and how do they talk (HTTP, subprocess, files)?
- DB for MVP: SQLite vs PostgreSQL; where project state lives.
- How the Studio gets a live preview of a HyperFrames scene, and what the unit of
  editing is (scene JSON patch vs regenerated HTML).
- Layout variant switcher: is a variant a templateId option or a separate field?
- PPTX export: image-pack only (not editable) — confirm this is acceptable for MVP.
- Auth scope for MVP.
```

**Prompt S0.2 — Schema + fixtures (`domain-modeling`)**

```
Create in schemas/ the v1 contracts, with JSON Schema as the source and generated
Pydantic (Python) + Zod/TS types, plus a contract test that fails if they drift:
- DocumentContext, LessonOutline, LessonSceneJSON.
LessonSceneJSON per slide: slideId, templateId, layoutVariant, title, elements[],
animations[] {target, preset, delay, duration, easing}, voice {narration, provider,
voiceId, audioUrl, durationSeconds}, durationSeconds, notes.
Animation presets enum: fade-in, slide-in, zoom-in, typewriter, step-by-step,
highlight-keyword.
Also create fixtures/: document_context.sample.json, outline.sample.json,
scene.sample.json (10 slides, one per template), and a tiny sample.pptx.
Both of us must be able to work from fixtures without the other's code.
```

**Prompt S0.3 — API contract + tickets (`to-spec`, `to-tickets`)**

```
Write docs/API.md: endpoint, request, response, error codes for:
POST /projects, POST /projects/{id}/documents, GET/POST /projects/{id}/clarification,
POST/PUT /projects/{id}/outline (+approve), POST /projects/{id}/scene (generate),
GET/PUT /projects/{id}/scene, POST /projects/{id}/slides/{sid}/narration,
POST /projects/{id}/slides/{sid}/audio, POST /projects/{id}/export {type: mp4|pdf|pptx},
GET /exports/{id}.
Then run to-tickets: split into tracer-bullet tickets tagged [A] or [B], with
blockers. Only the schema freeze may block both of us.
```

**Điểm đóng băng:** merge `schemas/`, `docs/API.md`, `fixtures/` vào `main`, cả hai rebase rồi mới tách.

---

## 3. Track A — Pipeline & Export (Người A)

Thêm block ngữ cảnh + block phân vùng (owned: `scripts/` Python, `server.js`/`server/`, `storage/`, `tests/pipeline/`).

### A1 — Ingestion (Phase 1.1)
Skills: `tdd`, `diagnosing-bugs`
```
Use TDD. Harden scripts/pptx_to_lecture.py and add MarkItDown for PDF, DOCX and MD.
Output DocumentContext.json conforming to schemas/: title, sections, bullets, tables,
embedded images (saved to storage/ with stable ids), speaker notes, content order.
Typed errors for unsupported type / too large / parse failure. Tests first using
fixtures (pptx, pdf with table, docx, md). Expose POST /projects/{id}/documents per
docs/API.md. Acceptance: all 4 formats produce schema-valid output.
```

### A2 — Clarification (Phase 1.2, backend)
Skills: `codebase-design`, `tdd`, `grill-me` (rà câu hỏi)
```
Implement the 8-question clarification flow (audience, subject/goal, duration
5/10/20/45, slide count, language, style, quiz/check-in, voice-over). Pre-fill
answers inferable from DocumentContext and ask only to confirm those. Endpoints per
docs/API.md. Define the LLMProvider interface here (generate_structured with a
schema, retry with validation-error feedback) with GeminiProvider (use the
gemini-api-dev skill), OllamaProvider and a FakeProvider for tests.
```

### A3 — Outline generator (Phase 1.3, backend)
Skills: `gemini-api-dev`, `tdd`
```
Generate LessonOutline (learning_objectives, audience, estimated_duration, sections,
slides[], quiz[], summary) from DocumentContext + answers. Each outline slide must
carry a suggested templateId from the 10 templates and a content payload matching
that template's fields (coordinate field names with Person B via schemas/ PR only).
Support edit (PUT) and approve; scene generation is blocked until approved. Tests
with FakeProvider; one manual run with Gemini Flash.
```

### A4 — TTS + audio-first sync (Phase 4.1–4.2)
Skills: `codebase-design`, `tdd`, `diagnosing-bugs`
```
Implement TTSProvider (synthesize → audio file, text) with VieNeuProvider (default),
ViettelProvider and FakeTTS; build on scripts/synthesize_slide.py. Generate
narration per slide from content + speaker notes via LLMProvider; user-editable.
Measure real duration with ffprobe and write voice.audioUrl / voice.durationSeconds.
Sync rule (pure function, heavily unit-tested): slide.durationSeconds = max(audio
duration + padding, last animation end); recompute cumulative start times for all
following slides. Regenerate audio on narration change via a background job.
Test: audio shorter / equal / longer than animations, missing audio, 1-slide deck.
```

### A5 — Export (Phase 4.3)
Skills: `tdd`, `diagnosing-bugs`, `code-review`
```
Implement export jobs (status pending/running/done/failed) behind POST /export:
- MP4: call `npx hyperframes render` for 1080p with audio; verify CLI flags from its
  --help first. Run as a subprocess with timeout, log capture, cleanup.
- PDF: headless Chrome print of the scene HTML, vector text, Vietnamese fonts embedded.
- PPTX: image-pack (one high-res PNG per slide + notes). Document clearly that it is
  not editable.
Tests: output exists, MP4 duration ≈ sum of slide durations (ffprobe), PDF page count
= slide count, PPTX slide count = slide count. Spike Vietnamese diacritics first.
```

---

## 4. Track B — Engine & Studio (Người B)

Thêm block ngữ cảnh + block phân vùng (owned: `templates/`, `studio.html`/`studio/`, `scripts/build_hyperframes.js`, `outline_to_hyperframes.js`, `tests/engine/`).

### B1 — Design tokens + 10 templates (Phase 2.1)
Skills: `ui-ux-pro-max`, `design-system`, `frontend-design`, `tdd`
```
First create a design-token file (palette, Vietnamese-friendly fonts, spacing, 1920x1080
grid). Then build the 10 HyperFrames templates (title-slide, learning-objectives,
concept-explain, bullet-breakdown, image-explain, comparison, timeline, formula-explain,
quiz, summary) as HTML/CSS/GSAP following HyperFrames conventions (.clip, data-start,
timelines) — inspect scripts/build_hyperframes.js and the HyperFrames docs for the
exact conventions. Each template: content schema, default animations, layout variants.
Work only from fixtures/scene.sample.json. Validate each template with a snapshot
render of a Vietnamese-text sample (long text, diacritics, overflow).
```

### B2 — Mapper (Phase 2.2)
Skills: `tdd`, `codebase-design`
```
Implement outline_to_hyperframes.js: LessonOutline → LessonSceneJSON → root index.html
with .clip / data-start / GSAP timeline. Two pure steps with tests: (1) outline→scene
using the template registry, (2) scene→HTML. Slide start times must come from
durationSeconds so audio-first sync from Person A changes the timeline without code
changes. Test with fixtures; fail loudly on schema-invalid input.
```

### B3 — Studio direct editing (Phase 3.1)
Skills: `frontend-design`, `ui-styling`, `web-artifacts-builder` (prototype), `tdd`
```
Upgrade studio.html: slide list, canvas preview, properties panel. Click text to edit
(contentEditable) and click image to open a library/upload modal. Every edit produces
a patch to LessonSceneJSON (never raw HTML edits), validated against schemas/, saved via
PUT /projects/{id}/scene (use a mock server from fixtures until Person A's API lands).
Add undo/redo and debounced autosave. Unit-test the patch/reducer logic.
```

### B4 — Layout variants + animation presets (Phase 3.2–3.3)
Skills: `ui-ux-pro-max`, `frontend-design`
```
Add the layout variant switcher (text-left/image-right, text-right/image-left, top
banner, fullscreen, no image) and the animation picker for fade-in, slide-in, zoom-in,
typewriter, step-by-step, highlight-keyword with duration/delay/easing/target. Switching
a variant or preset only changes scene JSON, and the preview re-renders from it.
Add a single-slide time preview (play/pause/scrub).
```

### B5 — Voice UI + timeline in Studio (Phase 4.1 UI)
Skills: `frontend-design`, `tdd`
```
Add narration editor + "Tạo lại giọng đọc" button + audio player per slide, calling
Person A's endpoints. Show the audio-driven slide duration and update the preview
timeline when it changes. Disable export while any audio job is running.
```

---

## 5. Điểm tích hợp (Integration gates)

| Gate | Điều kiện | Ai làm |
|---|---|---|
| G1 | Schema + fixtures + API.md merge vào `main` | Cả hai |
| G2 | A3 xong (outline thật) ↔ B2 mapper nhận được outline thật | A giao, B kiểm tra |
| G3 | Studio (B3) chạy với API thật thay vì mock | B chuyển, A hỗ trợ lỗi API |
| G4 | A4 sync ↔ B5: đổi lời đọc, timeline co giãn đúng | Cả hai |
| G5 | A5 export MP4/PDF từ scene do Studio lưu | A chạy, B xem lỗi render |

**Prompt kiểm tích hợp (mỗi gate, một người chạy)**
```
Integration check for gate <Gx>. Without editing owned code of the other person, run
the end-to-end path using real services (no fixtures), list every contract mismatch
(field names, types, error codes, timing), and write them as issues tagged [A] or [B]
with a minimal repro. Do not fix other people's folders.
```

---

## 6. Lịch gợi ý (song song, bám ngày trong plan)

| Giai đoạn | Người A | Người B |
|---|---|---|
| Ngày 0 | Sprint 0 chung | Sprint 0 chung |
| Tuần 1 | A1 → A2 → A3 | B1 → B2 (dùng fixtures) |
| Tuần 2 | A4 (TTS + sync) | B3 → B4 (Studio, mock API → API thật tại G3) |
| Tuần 3 | A5 (Export) | B5 + chỉnh template theo lỗi render + test E2E |

Nếu một người trễ, người kia làm trước các việc không phụ thuộc (B có thể làm Studio hoàn toàn bằng fixtures).

## 7. Cuối mỗi sprint

Skills: `improve-codebase-architecture`, `code-review`, `retro`, `handoff`
```
Audit the repo: no file outside an owner's folder was changed except via shared PRs;
LLM/TTS providers are only referenced through interfaces; every slide is representable
by LessonSceneJSON; the engine has no hand-written per-slide HTML. Output a prioritized
fix list.
```

**Handoff:** mỗi người viết `docs/handoff-<A|B>.md` (≤ 80 dòng): đã làm, file đổi, quyết định (ADR), việc kế tiếp, lệnh để chạy lại.

---

## 8. Điểm cần xác nhận trong plan.md

1. **Backend:** plan ghi "FastAPI / Node" mà chưa chốt. Đề xuất: Python cho ingestion/LLM/TTS, Node cho HyperFrames + server; chốt ở S0.1.
2. **PPTX dạng ảnh** không sửa được. Yêu cầu gốc là slide editable, nên cần xác nhận đây chỉ là bản tạm cho MVP.
3. **Gantt** đang đánh dấu Ingestion "done" và Clarification "active" trong khi checklist chưa tick. Cập nhật cho khớp trước khi bắt đầu.
4. **Thứ tự phụ thuộc:** audio-first sync (Phase 4) ảnh hưởng timeline của mapper (Phase 2). Vì vậy `durationSeconds` phải nằm trong schema ngay từ Sprint 0.
