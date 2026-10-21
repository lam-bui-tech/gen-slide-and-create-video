# NGƯỜI A — Backend / Pipeline — Playbook thực thi v2 (Template-First)

Nguồn: `docs/AS_IS.md`, `docs/SPEC_V2.md`, `docs/TICKETS.md` (phần v2, P1 → P7).
Prompt viết bằng tiếng Anh để dán vào Claude Code. Phần giải thích bằng tiếng Việt.

---

## 1. Vai trò, vùng sở hữu, môi trường

**Vai trò:** FastAPI backend, ingestion, LLM, slot filling, media recommender, TTS/sync, export, API pack, schemas.

| Sở hữu (được sửa) | Không được sửa (của B) |
|---|---|
| `server/`, `scripts/`, `schemas/` (PR chung, B duyệt), `server.js` (proxy/static), `storage/`, `tests/pipeline/`, `tests/test_contracts.py` | `templates/`, `studio.html`, `studio/`, `outline_to_hyperframes.js`, `tests/engine/` |

- **Ngoại lệ có kiểm soát:** P1.1 cần xóa 3 fallback ảo trong `outline_to_hyperframes.js` (file của B). Được sửa **đúng phần đó**, mở PR nhỏ riêng, B duyệt.
- **Môi trường Windows:** đặt `PYTHONUTF8=1` (hoặc `sys.stdout.reconfigure(encoding="utf-8")`) cho mọi script Python in tiếng Việt. Log terminal của bạn đã từng lỗi `UnicodeEncodeError: 'charmap'` khi in danh sách giọng VieNeu.
- Một worktree riêng: `git worktree add ../studio-A -b feat/a-v2` (skill `using-git-worktrees`). Rebase từ `main` mỗi ngày, merge sau **mỗi ticket**.

## 2. Thiết lập một lần

Skills: `using-git-worktrees`, `git-guardrails-claude-code`, `setup-pre-commit`

Thêm vào `CLAUDE.md` (dưới 150 dòng, chỉ ghi điều Claude không tự biết):
```
IMPORTANT: Person A owns server/, scripts/, schemas/, server.js, storage/, tests/pipeline/.
YOU MUST NOT edit templates/, studio*, outline_to_hyperframes.js, tests/engine/ (Person B).
Schema changes go through a small separate PR that B reviews.
IMPORTANT: AI outputs structured JSON only; providers (LLM/TTS) only via interfaces.
IMPORTANT: v1 projects must keep opening (migrate_v1_to_v2). Never delete v1 code paths
until docs/TICKETS.md says so.
Run tests: pytest tests/pipeline tests/test_contracts.py. Env: Windows, PYTHONUTF8=1.
```

## 3. Prompt khởi động mỗi phiên (master prompt)

```
You are Person A (backend/pipeline) on "AI Lecture Studio v2" (template-first).
Read first: docs/AS_IS.md, docs/SPEC_V2.md, docs/TICKETS.md (v2 section), docs/adr/.
Work ONLY on tickets tagged [A] (and the A-part of [A/B]) in the order of section 5.
For each ticket: (1) restate scope + acceptance in 5 lines, (2) Plan Mode, list files to
touch, (3) tdd: write failing tests first, (4) implement minimal code, (5) run tests,
(6) update the ticket status in docs/TICKETS.md, (7) commit on my branch with a clear
message, (8) report: files changed, how to run/test, risks, anything B must know.
Stop and tell me when: a ticket is blocked by B, a contract/schema change is needed, or
you need to edit a file outside my ownership. Do not guess; ask.
Ticket to do now: <PASTE TICKET ID>
```

## 4. Skill / plugin theo từng ticket

| Ticket | Skill / plugin chính |
|---|---|
| P1.1 | `diagnosing-bugs`, `tdd` |
| P1.2 | `domain-modeling`, `codebase-design`, `tdd` |
| P1.3 | `tdd`, `diagnosing-bugs` |
| P2.2 | `codebase-design`, `tdd` |
| P3.1 | `gemini-api-dev` (+ plugin `gemini-api`), `tdd` |
| P3.2 | `gemini-api-dev`, `tdd`, `diagnosing-bugs` |
| P4.1, P4.2 | `gemini-api-dev`, `tdd`; MCP `huggingface` chỉ khi bật ảnh AI |
| P5.3 | `tdd`, `code-review` |
| P6.1 | `diagnosing-bugs` (spike, ghi ADR) |
| P6.2 | `tdd`, `diagnosing-bugs` |
| P7.1, P7.2 | `tdd` |
| Mọi ticket | `implement` / `implement-spec`, `code-review`, plugin `pr-review-toolkit`, `finishing-a-development-branch`, `handoff` |
| Cuối mỗi phase | `improve-codebase-architecture`, `retro` |

## 5. Thứ tự làm & điểm phụ thuộc

| Đợt | Việc của A | Chờ gì từ B |
|---|---|---|
| 0 | **P1.1** (làm trước) → **P1.2** (merge sớm vì mở khóa B) | — |
| 1 | **P1.3** migration (Python + golden fixtures) | B làm P1.4 → P1.5 sau khi P1.2 merge |
| 2 | **P2.2** API packs; **P7.1**, **P7.2** (không phụ thuộc) | B làm P2.1 → P2.3 |
| 3 | **P3.1**, **P3.2** | — (B chạy P5.1 trong lúc chờ) |
| 4 | **P4.1** → **P4.2** | B làm P3.3 |
| 5 | **P5.3**, **P6.1** (chung) → **P6.2** | B làm P5.2, P4.3, P6.3 |
| 6 | **P7.3-API** (đề xuất, mục 7) | B làm P7.3, P7.4 |

---

## 6. Prompt từng ticket

### P1.1 — Sửa lỗi 404 ảnh & xóa fallback ảo (bắt buộc làm trước)
Skills: `diagnosing-bugs`, `tdd`
```
Current (docs/AS_IS.md §4.1): server.js proxies every /storage request to
localhost:8000, but server/api_service.py only registers the audio route
(/storage/projects/{project_id}/audio/{filename}); there is NO route for
/storage/projects/{project_id}/images/{filename}, so every extracted image returns 404.
Also outline_to_hyperframes.js (~lines 478, 489, 501) falls back to
'storage/projects/sample/images/philosophy_intro.png', a file that does not exist.
Target: all extracted images are served with 200 and correct content-type; no phantom
fallback remains.
Do:
1) Reproduce first: upload a PPTX with images, collect the image URLs from
   DocumentContext, request them, confirm 404. Keep this as a failing test.
2) Serve /storage/projects/{id}/images/ (and prepare /videos/) from FastAPI with a safe
   static mount (reject path traversal; correct Content-Type; ETag/Cache-Control).
   Check the Node proxy forwards headers/Range correctly; fix server.js if needed.
3) Remove the 3 phantom fallbacks. Allowed exception: edit ONLY those lines in
   outline_to_hyperframes.js, in a separate small commit/PR for Person B to review.
   When an image is absent, do not emit an <img> (no broken URL). Tell B in the report.
Acceptance: test uploads a PPTX with images and asserts every image URL returns 200;
no string "sample/images" in the repo; docs/qa report shows no 404.
```

### P1.2 — Schema v2 (hợp đồng chung, merge sớm)
Skills: `domain-modeling`, `codebase-design`, `tdd`
```
Implement SPEC_V2 §2 in: schemas/template_pack.json (new), schemas/lesson_scene.json
(v2; keep the v1 schema as schemas/lesson_scene_v1.json for migration), Pydantic models
(schemas/models.py) and Zod/TS types (schemas/types.ts). Project gets packId and
schemaVersion. Add a contract drift test (tests/test_contracts.py) that fails when JSON
Schema, Pydantic and Zod disagree (enums, required fields, defaults).
Corrections to apply to the spec while implementing (note them in an ADR):
- voice.audioUrl and voice.durationSeconds must be NULLABLE: they are null until
  synthesis, but SPEC_V2 lists them as required non-null.
- The outline's suggestedTemplateId (schemas/lesson_outline.json) must not be a hard
  enum of the old 10 ids; use suggestedLayoutId validated at runtime against the chosen
  pack. Keep reading the old field for v1.
- Tag enums (subject/style/effect) come from SPEC_V2 §2.1; centralize them in one place.
Open a PR touching only schemas/ + tests; Person B must approve before merge.
This unblocks P1.3, P1.4, P1.5, P3.2.
Acceptance: contract test green; fixtures validate; v1 fixtures still validate against v1.
```

### P1.3 — `migrate_v1_to_v2`
Skills: `tdd`, `diagnosing-bugs`
```
Implement scripts/migrate_v1_to_v2.py as a pure, idempotent function per SPEC_V2 §4:
schemaVersion>=2 with packId -> unchanged; else packId="basic", schemaVersion=2, and per
slide layoutId=templateId and elements -> slotValues (badge->badge, title->title,
text|quote->body, bullet-list->bullets, image->media, formula->formula,
quiz-block->quiz, timeline-step->timeline); unmatched elements stay in elements[].
Also provide a CLI for batch migration with --dry-run and an automatic backup of the
original project JSON/SQLite rows before writing. Expose an in-memory migrate-on-read
helper for the API.
Produce golden fixtures in fixtures/migration/ (v1 input + expected v2 output) for all
10 layouts so Person B can port the same logic to JS and test against identical files.
Tests: idempotency, no data loss (every v1 text/media value appears in v2), unknown
elements preserved, bad input rejected with clear errors.
Acceptance: all v1 fixtures migrate; running twice changes nothing; backups created.
```

### P2.2 — API Packs & Project v2
Skills: `codebase-design`, `tdd`
```
Add to FastAPI (SPEC_V2 §3): GET /packs?subject=&style=&effect= (AND across dimensions,
OR within one), GET /packs/{id} (layouts, tokens, preview link), POST /projects
{packId, title} (create project BEFORE upload; reject unknown packId), POST /packs
(save a new pack for the Builder; the built-in "basic" pack is read-only: editing means
copy-on-write into a new pack).
Packs live in templates/packs/<id>/pack.json and are validated with
schemas/template_pack.json. Write a read-only Python pack loader; do not edit B's
registry. Add a contract test that Python and JS loaders accept/reject the same fixture
packs (B provides the JS side).
Errors: 404 unknown pack, 422 invalid pack with field paths. Cache the pack list;
invalidate on write.
Acceptance: API tests for filters, detail, create-project, invalid pack; docs/API.md updated.
```

### P3.1 — AdaptiveClarificationService
Skills: `gemini-api-dev`, `tdd`
```
Replace the fixed 8-question flow for v2 projects (keep v1 ClarificationService for v1
projects). GET /projects/{id}/clarify returns {inferred:[{key,value,confidence}],
questions:[...]}. Infer subject, audience, style, language, expected duration from
DocumentContext + pack.tags/tokens. Ask only when confidence < 0.8, plus voice and
quiz/check-in choices. POST /projects/{id}/clarify stores answers and triggers the
SlotFiller (P3.2). Use LLMProvider.generate_structured with a schema; heuristics first,
LLM second; FakeProvider for tests.
Acceptance: a sample lecture yields at most 2 questions (Gate G2b); answers persist;
tests for inference, skipping and low-confidence paths.
```

### P3.2 — SlotFillerEngine (+ sửa nguyên nhân gốc thứ 2 của slide trắng)
Skills: `gemini-api-dev`, `tdd`, `diagnosing-bugs`
```
Current: scripts/outline_generator.py ignores DocumentContext.extractedImages and
section.imageIds (AS_IS §4.2), so the LLM never sees available images and slides come
out empty.
Target: SlotFillerEngine takes DocumentContext + the chosen layout's schema and fills
slotValues via structured LLM output.
Do:
1) Include an image inventory (id, caption, nearText, size) in the prompt; the model may
   only reference ids from the inventory (validate; reject invented ids).
2) Plan layouts per slide by layout.purpose from the pack, then fill each slot.
3) Enforce constraints (maxChars, maxItems, accepts). On overflow: retry up to 2 times
   asking the LLM to condense; last resort deterministic split into two slides.
4) Output SlideSceneV2 with voice {narration, audioUrl:null, durationSeconds:null}.
5) Return the slide plan in the response so the UI can show the deck structure.
Pure functions + FakeProvider tests: overflow, invented image id, missing optional slot,
image-less document.
Acceptance (Gate G2b): chosen pack + sample upload -> filled deck, no empty slots, images
referenced when available.
```

### P4.1 — `visual_need`
Skills: `gemini-api-dev`, `tdd`
```
For each slide produce visual_need {type: diagram|chart|photo|video|none, description,
searchQuery, altText, confidence}. Rules: math/science -> prefer diagram/formula/chart;
abstract or pure-text slides -> none; tables with numbers -> chart. Structured output,
validated, cached per (slideId, content hash). Tests on sample slides.
```

### P4.2 — MediaSource adapters + endpoints
Skills: `gemini-api-dev`, `tdd`; MCP `huggingface` only if AI images are enabled
```
Implement MediaSource interface returning MediaCandidate[] and 3 adapters:
- DocumentImageSource: rank extracted images by similarity of caption/nearText to the
  slide (start with accent-insensitive keyword/BM25; optional embeddings later).
- DiagramSource: generate SVG/Mermaid/Chart.js output from tables or described
  structure and save it as a static asset served like images (must render in
  HyperFrames and in PDF export).
- UploadSource: POST /projects/{id}/media-upload for images (video comes in P6.2).
Endpoint: GET /projects/{id}/media-recommendations/{slideId} -> 3-4 candidates with
source, type, url, alt, relevance. An "ai-image" adapter exists behind a config flag,
OFF by default. Treat "license" as a provenance label, not a legal claim.
Acceptance: relevant candidates for sample slides; every URL returns 200; tests for
ranking and diagram generation.
```

### P5.3 — API lưu Layout từ Builder
Skills: `tdd`, `code-review`
```
Implement POST /packs/{id}/layouts: validate the Layout against the schema (slots,
decor, variants, animations; tags only from the enums), enforce unique layout ids,
write layout JSON atomically into the pack, reject path traversal, refuse to modify the
built-in "basic" pack (return a hint to duplicate it). Generate a thumbnail by
screenshotting the layout with sample content via the existing headless-Chrome export
code. Version the pack file and return the updated pack.
Acceptance (Gate G4): a layout created in the Builder appears in GET /packs/{id} and in
the gallery, and renders in a real project. Tests: invalid layout, duplicate id,
read-only pack, thumbnail exists.
```

### P6.1 — Spike video (chung với B)
Skills: `diagnosing-bugs`
```
Spike only. AS_IS §5 says HyperFrames supports embedded <video> (--video-frame-format,
data-start, data-duration, data-media-start, data-volume, data-has-audio, muted) based
on docs; verify with a REAL render, not just docs. Build a 10-second composition with a
local MP4 clip + narration audio, render with `npx hyperframes render`, then ffprobe:
duration, audio streams, A/V sync, trim correctness, render time, file size. Test a clip
with and without audio, and trim start/end. Write docs/spikes/P6.1.md and an ADR with
supported flags, limits, the recommended data-attribute contract for the mapper, and a
fallback if something fails. Share findings with Person B before P6.2/P6.3.
```

### P6.2 — Upload video + poster frame
Skills: `tdd`, `diagnosing-bugs`
```
POST /projects/{id}/media-upload accepts MP4/WebM: validate extension + MIME sniff +
configurable size limit, ffprobe duration/codec/audio presence, store under
storage/projects/{id}/videos/, extract a poster frame with FFmpeg, serve with Range
support (206). Return a MediaCandidate {type:"video", url, posterUrl, durationSeconds}.
If the schema needs posterUrl/trimStart/trimEnd, do a small shared-schema PR (B reviews).
Update sync_audio_first_timeline: slide.durationSeconds = max(narration + 0.8s,
trimmed clip length, animation end, 3.0s) without changing behavior for slides without
video. export_service.py: use the poster frame for PDF/PPTX; MP4 uses the real clip per
the spike contract.
Acceptance (Gate G5 with B): a slide with a clip exports to MP4 with the right duration
and audio; PDF/PPTX show the poster. Tests for validation, Range, duration rule.
```

### P7.1 — Phụ đề SRT/VTT
Skills: `tdd`
```
GET /projects/{id}/subtitles.srt|vtt built from per-slide narration and measured audio
duration (split into sentences proportionally; keep line length readable for Vietnamese).
First check how the existing subtitle bar (#vVoiceText) in the generated HTML works, and
reuse it for burn-in if possible; otherwise burn in with FFmpeg and ensure a font with
Vietnamese diacritics is available. Tests: timing monotonic, no overlap, UTF-8 correct.
```

### P7.2 — Chuẩn hóa phát âm tiếng Việt
Skills: `tdd`
```
Add scripts/pronunciation.py applied only to TTS input (never to displayed text):
a terminology dictionary per subject + per-project overrides, and rules to read math
(x², √x, a/b, %, units, Greek letters, exponents). Keep VieNeu/Viettel behind the
TTSProvider interface. Table-driven tests with a math lesson sample. Expose an endpoint
to preview a phrase's spoken form.
```

### P7.3-API — Endpoint chat sửa slide (đề xuất, SPEC chưa có)
Skills: `gemini-api-dev`, `tdd`
```
Ticket P7.3 [B] needs an LLM endpoint that is not in the SPEC_V2 API table. Add
POST /projects/{id}/slides/{slideId}/chat {instruction} -> {patch, diff} where patch is
a validated JSON patch on slotValues only (never HTML), respecting slot constraints.
No persistence until the client applies it through PUT /scene. Tests with FakeProvider.
```

---

## 7. Điểm giao tiếp với Người B

| Khi | A giao | B cần |
|---|---|---|
| Sau P1.2 | schema v2 + contract test đã merge | bắt đầu P1.4, P1.5 |
| Sau P1.3 | `fixtures/migration/*` | port migration sang JS cùng fixture |
| Sau P2.2 | API packs + `docs/API.md` | P2.1, P2.3 dùng API thật thay mock |
| Sau P3.1–3.2 | `/clarify` + Scene v2 mẫu | P3.3 |
| Sau P4.2 | endpoint media + fixture response | P4.3 |
| Sau P5.3 | `POST /packs/{id}/layouts` | P5.2 lưu thật |
| Sau P6.1–6.2 | ADR spike + upload API | P6.3 |

Prompt kiểm tích hợp (mỗi gate G1–G5):
```
Integration check for gate <Gx>. Without editing the other person's folders, run the
end-to-end path against real services (no fixtures). List each mismatch (field names,
types, timing, status codes) as issues tagged [A] or [B] with a minimal repro.
```

## 8. Kết thúc ticket / phase

```
Run code-review and the pr-review-toolkit checks on my branch: backward compatibility
with v1 projects, schemas in sync (contract test), no edits outside my ownership,
providers only via interfaces, tests cover core logic. Fix blockers, then use
finishing-a-development-branch, update docs/TICKETS.md, and write docs/handoff-A.md
(max 80 lines: done, files changed, decisions/ADRs, next ticket, commands to resume).
```
Sau mỗi phase: `improve-codebase-architecture` + `retro`, rồi `/clear`.

## 9. Điểm cần chốt trước khi chạy

1. **Trạng thái ticket v1**: trong `TICKETS.md`, ticket 06–08 còn `pending/ready-for-agent` nhưng 09–10 (phụ thuộc 08) đã `completed`. Sửa lại trạng thái để agent không hiểu nhầm.
2. **Bước duyệt dàn bài**: luồng v2 trong SPEC đi thẳng Clarify → SlotFiller và bỏ bước duyệt outline của v1. Cân nhắc giữ bước duyệt cấu trúc deck (P3.2 trả về slide plan để làm việc này).
3. **API Builder**: SPEC ghi `POST /packs`, ticket ghi `POST /packs/{id}/layouts`. File này giữ cả hai (tạo pack / thêm layout).
4. **Hai registry**: Python (API) và JS (engine) cùng đọc `templates/packs/`; dựa vào một JSON Schema duy nhất và contract test chéo.
5. **`license` mặc định "educational-fair-use"** trong schema là nhãn nguồn gốc, không phải khẳng định pháp lý; nên có ADR về chính sách ảnh trước khi bật nguồn bên ngoài.
