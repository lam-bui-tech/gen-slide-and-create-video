# NGƯỜI B — Engine / Studio — Playbook thực thi v2 (Template-First)

Nguồn: `docs/AS_IS.md`, `docs/SPEC_V2.md`, `docs/TICKETS.md` (phần v2, P1 → P7).
Prompt viết bằng tiếng Anh để dán vào Claude Code. Phần giải thích bằng tiếng Việt.

---

## 1. Vai trò, vùng sở hữu, môi trường

**Vai trò:** Template Pack, Registry, mapper HyperFrames, Studio canvas, Template Gallery, Media Strip, Template Builder, video trên canvas, chat sửa slide, bảng kiểm tra chất lượng.

| Sở hữu (được sửa) | Không được sửa (của A) |
|---|---|
| `templates/`, `studio.html`, `studio/`, `outline_to_hyperframes.js`, `reducer.js` (nếu là bản đang dùng), `tests/engine/`, `docs/prototypes/` | `server/`, `scripts/`, `schemas/` (chỉ duyệt PR), `server.js`, `storage/`, `tests/pipeline/` |

- **Duyệt PR chéo:** A có một ngoại lệ nhỏ ở P1.1 (xóa 3 fallback ảo trong `outline_to_hyperframes.js`). Bạn là người duyệt PR đó; kiểm tra slide không có ảnh vẫn render được (không còn `<img>` hỏng).
- **File trùng lặp:** AS_IS liệt kê cả `studio.html` lẫn `studio/index.html`, `reducer.js` lẫn `studio/reducer.js`. **Chốt bản chính** (xem mục 9) trước khi sửa, kẻo hai bản lệch nhau.
- Worktree riêng: `git worktree add ../studio-B -b feat/b-v2` (skill `using-git-worktrees`). Rebase từ `main` mỗi ngày, merge sau **mỗi ticket**.
- Môi trường Windows; chạy `npx` qua shell của Windows, tránh lệnh chỉ có trên Linux.

## 2. Thiết lập một lần

Skills: `using-git-worktrees`, `git-guardrails-claude-code`, `setup-pre-commit`

Thêm vào `CLAUDE.md`:
```
IMPORTANT: Person B owns templates/, studio.html, studio/, outline_to_hyperframes.js,
tests/engine/. YOU MUST NOT edit server/, scripts/, schemas/, server.js, storage/
(Person A). Schema changes go through a small PR that both approve.
IMPORTANT: every edit in Studio/Builder produces a patch to LessonSceneJSON v2
(slotValues/elements/media/animations); never edit generated HTML by hand.
IMPORTANT: keep the visual output of the existing 10 layouts unchanged; the snapshot
tests in tests/engine/test_templates_snapshot.py must stay green.
Never emit an <img> with an empty or missing src; render a no-image variant instead.
Verify HyperFrames behavior via `npx hyperframes docs ...` / --help; do not assume.
```

## 3. Prompt khởi động mỗi phiên (master prompt)

```
You are Person B (engine/Studio) on "AI Lecture Studio v2" (template-first).
Read first: docs/AS_IS.md, docs/SPEC_V2.md, docs/TICKETS.md (v2 section), docs/adr/.
Work ONLY on tickets tagged [B] (and the B-part of [A/B]) in the order of section 5.
Until Person A's APIs are merged, develop against mocks built from fixtures/ and the
SPEC_V2 contracts; switch to the real API at the gate.
For each ticket: (1) restate scope + acceptance in 5 lines, (2) Plan Mode, list files to
touch, (3) tdd for logic (reducers, registry, mapper), (4) implement, (5) run
tests/engine and open the Studio to verify visually, (6) update the ticket status in
docs/TICKETS.md, (7) commit, (8) report: files changed, how to run/test, risks, what A
must know. Stop and tell me when a ticket is blocked by A, a schema change is needed,
or you need to edit a file outside my ownership. Do not guess; ask.
Ticket to do now: <PASTE TICKET ID>
```

## 4. Skill / plugin theo từng ticket

| Ticket | Skill / plugin chính |
|---|---|
| P1.4 | `design-system`, `codebase-design`, `tdd` |
| P1.5 | `codebase-design`, `tdd` |
| P2.1 | `web-artifacts-builder`, `ui-ux-pro-max`, `design-system`, plugin `frontend-design` |
| P2.3 | `frontend-design`, `ui-styling`, `tdd` |
| P3.3 | `frontend-design`, `ui-styling`, `tdd` |
| P4.3 | `ui-ux-pro-max`, `ui-styling`, `tdd` |
| P5.1 | plugin `feature-dev` (architect), `frontend-design`, `tdd` |
| P5.2 | `ui-ux-pro-max`, `design-system`, `tdd`; MCP `figma` nếu có thiết kế mẫu |
| P6.1 | `diagnosing-bugs` (chung với A) |
| P6.3 | `frontend-design`, `tdd` |
| P7.3 | `frontend-design`, `tdd` |
| P7.4 | `tdd` |
| Mọi ticket | `implement` / `implement-spec`, `code-review`, plugin `pr-review-toolkit`, `finishing-a-development-branch`, `handoff` |
| Cuối mỗi phase | `improve-codebase-architecture`, `retro` |

## 5. Thứ tự làm & điểm phụ thuộc

| Đợt | Việc của B | Chờ gì từ A |
|---|---|---|
| 0 | Duyệt PR P1.1 của A; **P6.1** spike (chung); chốt file chính (mục 9); đọc schema v2 | A merge **P1.2** |
| 1 | **P1.4** → **P1.5** | P1.2; A làm P1.3 (fixtures migration cho port JS) |
| 2 | **P2.1** → **P2.3** | A làm P2.2 (API packs) |
| 3 | **P5.1** (không bị chặn bởi P3) | A làm P3.1, P3.2 |
| 4 | **P3.3**; **P5.2** | P3.1, P3.2 merge; P5.3 sẽ tới sau |
| 5 | **P4.3**; **P6.3** | P4.2; P6.1–P6.2 |
| 6 | **P7.3**, **P7.4** | P7.3-API của A |

---

## 6. Prompt từng ticket

### P6.1 — Spike video (chung với A, làm sớm)
Skills: `diagnosing-bugs`
```
Spike only. Together with Person A verify, with a REAL render, that HyperFrames renders
an embedded local <video> inside a slide composition (data-start, data-duration,
data-media-start for trim, data-volume, data-has-audio / muted, --video-frame-format).
Your part: write the HTML composition(s) (clip with audio, clip muted, trimmed clip,
clip longer than narration) following the HyperFrames docs, run them, and record what
works in docs/spikes/P6.1.md with the exact data-attribute contract the mapper should
emit. Do not touch production code.
```

### P1.4 — Đóng gói 10 layout thành Pack "Basic"
Skills: `design-system`, `codebase-design`, `tdd`
```
Current (AS_IS §2): the 10 templates are hard-coded in four places: templates/templates.css
(.hf-template-<id>), templates/index.js (TEMPLATES metadata + renderSlide switch),
outline_to_hyperframes.js (VALID_TEMPLATES, buildElementsForTemplate,
buildDefaultAnimations) and studio/reducer.js (ALLOWED_TEMPLATES).
Target: a Template Pack "basic" at templates/packs/basic/pack.json following
schemas/template_pack.json: id, name, description, tags (subject/style/effect from the
enums), tokens (colors, fonts, spacing taken from templates.css), and 10 layouts.
Each layout: id == the old templateId (so migration is trivial), purpose, slots (derive
from TEMPLATES[...].slots), decor, variants (from allowedVariants/defaultVariant, default
variantId "default"), defaultAnimations (from buildDefaultAnimations).
Constraints: the rendered output of every layout must stay pixel-identical;
tests/engine/test_templates_snapshot.py must pass unchanged. Do not delete the old
registries yet (P1.5 replaces them).
Acceptance: pack.json validates against the schema; a script renders all 10 layouts from
the pack and matches the existing snapshots.
```

### P1.5 — TemplateRegistry + thay mọi tham chiếu `templateId`
Skills: `codebase-design`, `tdd`
```
Build templates/registry.js: list(), get(packId), getLayout(packId, layoutId),
validate(pack) loading from templates/packs/ and validating with the shared schema
(Zod/Ajv). Errors must name the file and field path.
Replace hard-coded lists with registry lookups: ALLOWED_TEMPLATES (studio reducer),
VALID_TEMPLATES / validateScene / outlineToScene / buildElementsForTemplate /
buildDefaultAnimations (outline_to_hyperframes.js), TEMPLATES[...] and the
.hf-template-${templateId} class in templates/index.js. Use packId + layoutId from the
scene; for v1 scenes call a JS port of migrateV1ToV2 (test it against A's golden
fixtures in fixtures/migration/ so JS and Python give identical results).
Update every B-side reference listed in AS_IS §3 (studio.html, studio/index.html,
reducers, tests/engine/*). Consolidate duplicate studio/reducer files first (ask me which
is canonical).
Add a contract test that the JS registry accepts/rejects the same fixture packs as
Person A's Python loader.
Acceptance (Gate G1): a v1 project opens through migration and renders the same; the
basic pack loads from the registry; all engine tests green.
```

### P2.1 — Prototype Template Gallery
Skills: `web-artifacts-builder`, `ui-ux-pro-max`, `design-system`, plugin `frontend-design`
```
Prototype the Template Gallery as a single-file app in docs/prototypes/gallery.html
using mock data shaped like GET /packs (SPEC_V2 §3). Features: grid of pack cards with
animated or thumbnail previews, filters for subject / style / effect (Vietnamese labels
mapped from the enum slugs, AND across filter groups, OR within), search, empty state,
detail drawer listing the pack's layouts, and a "Use this template" button. Follow the
design tokens; keyboard accessible; works at laptop and wide screens.
Goal: validate UX before building it into Studio. List the decisions that need my input.
```

### P2.3 — Gallery làm bước 1 trong Studio
Skills: `frontend-design`, `ui-styling`, `tdd`
```
Port the approved prototype into studio.html as the first step: Gallery -> choose pack ->
POST /projects {packId} -> content loading step. Add a "Recent projects" list; opening an
old project goes through in-memory migration. Implement the flow state as a small,
testable state machine (gallery, pack-selected, uploading, clarifying, studio) with unit
tests. Use Person A's real GET /packs, /packs/{id}, POST /projects once merged; mock
until then. Loading and error states for every request.
Acceptance (Gate G2a): open the app -> pick a pack -> project created; old projects
still open.
```

### P3.3 — Nạp nội dung & xác nhận 1 chạm
Skills: `frontend-design`, `ui-styling`, `tdd`
```
After pack selection show: file upload / paste text, then a compact confirmation screen
fed by GET /projects/{id}/clarify: inferred values (editable chips with confidence) and at
most the few required questions. On submit POST /projects/{id}/clarify, show progress,
then render the generated deck with every slot filled. Surface slot-overflow or
auto-split notes as small badges. Mock responses from fixtures until P3.1/P3.2 are merged.
Acceptance (Gate G2b): pack + upload -> at most 2 questions -> filled deck, no blank slide.
```

### P4.3 — Media Strip + variant fallback
Skills: `ui-ux-pro-max`, `ui-styling`, `tdd`
```
Add a Media Strip in the Studio sidebar: for the selected slide lazily call
GET /projects/{id}/media-recommendations/{slideId}, show 3-4 candidates (thumbnail, source
badge, relevance, alt text), one click applies it to the layout's media slot (updates
slotValues.media and scene.media[] via the reducer, undo/redo works). Include "None" and
an upload button (POST /media-upload).
If a slide ends up with no media, switch automatically to the variant "no-image" and make
sure the renderer never outputs an <img> without a valid src (this also protects against
the removed phantom fallbacks).
Unit-test: applying/removing media, variant fallback, undo.
Acceptance (Gate G3): recommended media fit the slide content; no empty or lopsided slide.
```

### P5.1 — Builder Mode (kéo thả) — làm tracer-bullet trước
Skills/plugins: `feature-dev` (architect), `frontend-design`, `tdd`
```
Add "Builder Mode" reusing the Studio canvas and reducer (undo/redo, autosave). Elements:
text, card, image, video, shape; drag, resize, snap-to-grid, align/distribute, keyboard
nudge, multi-select; coordinates in the 1920x1080 space.
Start with Plan Mode and one tracer bullet: draw a layout -> save locally as JSON -> load
it back. Unit-test the canvas reducers (move, resize, add, delete, align, undo).
Do not break existing Studio editing or autosave.
```

### P5.2 — Slot/Decor, ràng buộc, hiệu ứng, variant
Skills: `ui-ux-pro-max`, `design-system`, `tdd`; MCP `figma` nếu có
```
Add an inspector: mark an element as Slot (role from the enum, accepts, maxChars,
maxItems, aspectRatio, optional, defaultValue) or Decor; define variants (e.g.
text-left/image-right, no-image, fullscreen); attach GSAP animation presets
(fade, slide-in, zoom-in, typewriter, step-by-step, highlight-keyword) with
duration/delay/easing and a time preview; set tags (subject/style/effect from the enums).
Validate the Layout against the schema before saving; show field-level errors.
Save through Person A's POST /packs/{id}/layouts (mock until P5.3 merges); the built-in
"basic" pack is read-only, so offer "duplicate pack to edit".
Acceptance (Gate G4): a layout created in the Builder appears in the gallery and works in
a real project.
```

### P6.3 — Video trên canvas
Skills: `frontend-design`, `tdd`
```
Using docs/spikes/P6.1.md and Person A's upload API, add a video element/slot: trim
start/end slider, mute vs "under narration" (use the data-volume/muted contract proven in
the spike), poster frame, preview in the Studio. Make outline_to_hyperframes.js emit the
<video> with data-start, data-duration, data-media-start, data-volume exactly as the
spike specifies. Slide duration comes from the audio-first rule (A owns the sync).
Tests: mapper output for trimmed/muted/with-audio clips; reducer actions for trim.
Acceptance (Gate G5): export of a slide with a clip has the correct length and audio.
```

### P7.3 — Chat sửa từng slide
Skills: `frontend-design`, `tdd`
```
Add a per-slide chat box. Send the instruction to Person A's
POST /projects/{id}/slides/{slideId}/chat (see their P7.3-API) and receive a validated
patch on slotValues only. Show a diff (before/after), Apply / Discard, and apply through
the reducer so undo works. Never apply raw HTML. Regenerate narration only on request.
Mock the endpoint until it lands. Tests: patch application, rejection of invalid patches,
undo.
```

### P7.4 — Bảng kiểm tra chất lượng sư phạm
Skills: `tdd`
```
Add a deck review panel using pure functions: text density vs slot maxChars, narration
reading speed (chars per second measured from real audio duration), too-fast/too-slow
slides, empty or overfull layout (fill ratio), missing alt text, extreme slide durations.
Thresholds are configurable constants. Each warning links to its slide; no automatic
fixes without the user's click. Table-driven unit tests.
```

---

## 7. Điểm giao tiếp với Người A

| Khi | B cần | B giao |
|---|---|---|
| Sau P1.2 | schema v2 đã merge | — |
| Sau P1.3 | `fixtures/migration/*` | bản port JS của migration, test trùng fixture |
| Sau P1.5 | — | registry JS + contract test chéo với loader Python |
| Sau P2.2 | API packs thật | Gallery dùng API thật |
| Sau P6.1 | ADR spike | hợp đồng data-attribute cho mapper |

Prompt kiểm tích hợp (mỗi gate G1–G5):
```
Integration check for gate <Gx>. Without editing the other person's folders, run the
end-to-end path against real services (no fixtures). List each mismatch (field names,
types, timing, status codes) as issues tagged [A] or [B] with a minimal repro.
```

## 8. Kết thúc ticket / phase

```
Run code-review and the pr-review-toolkit checks on my branch: v1 projects still open,
the 10 basic layouts are visually unchanged (snapshots green), no <img> without src,
every edit goes through reducer patches on the scene JSON, no edits outside my
ownership. Fix blockers, then use finishing-a-development-branch, update
docs/TICKETS.md and write docs/handoff-B.md (max 80 lines: done, files changed,
decisions/ADRs, next ticket, commands to resume).
```
Sau mỗi phase: `improve-codebase-architecture` + `retro`, rồi `/clear`.

## 9. Điểm cần chốt trước khi chạy

1. **File trùng lặp** (`studio.html` vs `studio/index.html`, `reducer.js` vs `studio/reducer.js`): chọn bản chính, xóa hoặc đồng bộ bản kia trước P1.5.
2. **Trạng thái ticket v1**: `TICKETS.md` ghi 06–08 chưa xong nhưng 09–10 (phụ thuộc 08) đã `completed`. Sửa lại để agent không hiểu nhầm.
3. **Bước duyệt dàn bài** bị bỏ trong luồng v2 của SPEC. Nếu muốn giữ, P3.3 nên hiển thị slide plan để giáo viên duyệt trước khi điền slot.
4. **Slide trắng**: nguyên nhân gốc thứ 2 (LLM không thấy danh sách ảnh) được xử lý ở ticket P3.2 của A; B chỉ cần đảm bảo renderer chịu được slide không có ảnh.
5. **Enum tag** của pack cố định (subject/style/effect). Pack do Builder tạo bị giới hạn trong enum; muốn mở rộng phải đổi schema qua PR chung.
