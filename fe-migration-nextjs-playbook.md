# Chuyển FE từ `index.html` (vanilla JS) sang Next.js — Playbook prompt + skill

Repo: `lam-bui-tech/gen-slide-and-create-video` (đã clone và đo trực tiếp ngày 21/10/2026).
Prompt viết bằng tiếng Anh để dán vào Claude Code; phần giải thích bằng tiếng Việt.

---

## 1. Hiện trạng FE (số liệu đo từ repo)

| Hạng mục | Số liệu |
|---|---|
| `index.html` | 4420 dòng, ~182 KB |
| CSS inline | ~745 dòng (dòng 21–765) |
| HTML body (navbar, 3 pane, modal) | ~655 dòng (766–1421) + 3 modal đặt **sau** script (dòng ~4292–4420) |
| JS (`<script type="module">`) | ~2867 dòng (1422–4289) |
| Kiến trúc JS | **một class `StudioApp` với 57 method**, trong đó `bindEvents()` dài ~775 dòng |
| Phụ thuộc DOM | 139 id duy nhất truy cập bằng `getElementById`, 25 chỗ gán `innerHTML` |
| Gọi API | 14 chỗ `fetch` rải rác, base URL không thống nhất (`window.API_BASE`, `apiBase`, `API_BASE`), có fallback projectId giả `'demo'` / `'sample'` |
| Modal | gallery, outline review, pedagogy, image, upload progress, clarification, presentation (HUD toàn màn hình) |
| Module dùng chung (JS thuần, ES module) | `studio/reducer.js`, `flow.js`, `outline_editor.js`, `builder.js`, `quality.js`, `templates/index.js`, `registry.js`, `migration.js`, `tokens.css`, `templates.css` |
| Server | `server.js` (Node `http`, cổng 3000): phục vụ `index.html`, proxy `/projects /exports /storage` sang FastAPI :8000. Các route `/api/*` của nó **không còn được UI gọi** (0 chỗ) |
| Không có `package.json` ở thư mục gốc | Next.js cần thư mục riêng có `package.json` |

**Điểm tốt cho việc chuyển đổi:** logic nghiệp vụ không nằm trong `index.html` mà ở các module thuần (`reducer`, `flow`, `builder`, `quality`, `registry`, `migration`) và đã có test Python. `index.html` chủ yếu là **tầng giao diện + glue**, nên tách được mà không viết lại logic.

**Điểm khó:** `renderSlide()` trả về **chuỗi HTML**; Studio gán vào `#live-canvas` bằng `innerHTML`, rồi gắn `contenteditable`, click ảnh, và dựng timeline GSAP bằng DOM. Cùng chuỗi HTML đó cũng được `sceneToHyperFramesHtml` dùng để render MP4. Vì vậy **không được tách/viết lại template thành JSX trong đợt này**, nếu không giao diện Studio và video xuất ra sẽ lệch nhau.

---

## 2. Chọn Next.js hay React (Vite)?

**Đề xuất: Next.js 15 (App Router) + TypeScript strict + Zustand**, toàn bộ Studio là Client Components.

| | Next.js | React + Vite |
|---|---|---|
| Hợp với dự án | Khớp stack bạn đã định từ đầu (Next.js + TS + Zustand) và các dự án khác của bạn | Nhẹ hơn, ít khái niệm |
| Routing | Có sẵn (`/`, `/studio/[projectId]`, `/gallery`) | Cần thêm react-router |
| Proxy sang FastAPI | `rewrites` trong `next.config` (thay proxy trong `server.js`) | Proxy của Vite dev; production tự lo |
| Điểm cần cẩn thận | SSR: mọi thứ chạm `window/document` phải nằm trong client component; dev server hay chạm timeout khi proxy request LLM dài | Không có |

Studio là ứng dụng chỉnh sửa thuần phía client, không cần SEO. Nếu sau này bạn thấy Next.js thừa, đổi sang Vite không tốn nhiều vì phần lớn code là React component + store. Prompt F0.2 bên dưới sẽ hỏi lại bạn trước khi chốt.

---

## 3. Nguyên tắc chuyển đổi

1. **Strangler, không big-bang:** giữ `index.html` chạy nguyên ở cổng 3000 để đối chiếu; Next.js chạy cổng **3001** trong lúc chuyển. Chỉ xóa bản cũ khi qua cổng parity.
2. **Một nguồn sự thật cho logic:** `templates/` và `studio/` **giữ nguyên vị trí** (Python test, `outline_to_hyperframes.js` và `scripts/map_outline_to_scene.mjs` đang dùng). Next.js import trực tiếp, không copy/fork.
3. **Không đổi hành vi, chỉ đổi cấu trúc.** Mọi cải tiến (Tailwind, JSX hóa template, đổi UI) để sau khi đạt parity.
4. **Parity trước:** viết checklist và e2e cho luồng hiện tại **trước khi** chuyển, để biết "chạy đúng" nghĩa là gì.
5. **Debug được là mục tiêu chính:** mỗi pane có error boundary, log action, log request, drawer debug (F9).

---

## 4. Cấu trúc đích

```
web/                              # Next.js app mới (package.json riêng)
  src/
    app/
      layout.tsx                  # font, global css
      page.tsx                    # vào Studio (sau này: gallery / recent projects)
      studio/[projectId]/page.tsx
    components/
      shell/        Navbar, SlideNavigator, CanvasPane, PropsPanel
      canvas/       SlideCanvas, TimelineBar, useSlideTimeline
      props/        TemplateSelect, VariantGrid, NarrationBox, VoicePanel,
                    AnimationList, MediaStrip, VideoInspector, SlideChat
      modals/       GalleryModal, UploadProgress, ClarificationModal,
                    OutlineReviewModal, PedagogyModal, ImageModal, ModalHost
      builder/      BuilderToolbar, BuilderCanvas, BuilderInspector
      presentation/ PresentationMode, Hud
      debug/        DebugDrawer, ErrorBoundary
    store/          useStudioStore.ts (slice: scene, history, ui, flow, exports)
    lib/            api.ts (client duy nhất), types.ts, env.ts, editableSelectors.ts
    hooks/          useAutosave, useExportPolling, usePresentation, useHotkeys
    styles/         studio.css (port nguyên từ <style>), rồi tách dần
  next.config.mjs   # externalDir, rewrites, proxyTimeout
  tsconfig.json     # path alias @engine/* -> ../studio/*, @templates/* -> ../templates/*
templates/  studio/  schemas/   # GIỮ NGUYÊN, dùng chung
```

---

## 5. Bản đồ `StudioApp` → module mới

(số dòng tính xấp xỉ theo `index.html`, F0 sẽ xác minh lại)

| Method hiện tại | Chuyển thành |
|---|---|
| `constructor`, `init`, `dispatch`, `undo`, `redo`, `triggerAutosave`, `getCurrentSlide`, `setSlideIndex` | `useStudioStore` + `useAutosave` (vẫn gọi `sceneReducer` trong `studio/reducer.js`) |
| `renderNavbar`, `renderSlideList`, `renderAll` | `Navbar`, `SlideNavigator` (React tự re-render, bỏ `renderAll`) |
| `renderCanvas`, `setupSlideTimeline`, `play/pause/stopSlideTimeline`, `formatSeconds` | `SlideCanvas`, `useSlideTimeline`, `TimelineBar` |
| `renderProperties`, `updateNarrationStats`, `renderAnimationsList` | `PropsPanel` + các component con |
| `renderMediaStrip`, `renderVideoInspector`, `syncVideoTime` | `MediaStrip`, `VideoInspector` |
| `sendSlideChatInstruction`, `applySlideChatPatch`, `discardSlideChatPatch` | `SlideChat` |
| `loadAvailablePacks`, `openGalleryModal`, `closeGalleryModal`, `renderGalleryGrid`, `filterGalleryPacks` | `GalleryModal` |
| `handleDocumentUpload` (~200 dòng), `reviewOutlineModal` | `UploadProgress`, `ClarificationModal`, `OutlineReviewModal` + `lib/api.ts` |
| `openPedagogyModal`, `updatePedagogyReview` | `PedagogyModal` (dùng `studio/quality.js`) |
| `openImageModal`, `closeImageModal` | `ImageModal` |
| `toggleBuilderMode`, `addBuilderBlock`, `renderBuilderCanvas`, `updateInspectorCoords`, `renderBuilderInspector`, `saveDraftLayoutToPack` | `components/builder/*` (dùng `studio/builder.js`) |
| `createNewEmptyProject` | action trong store + `api.createProject` |
| `pollExportDownload` | `useExportPolling` |
| `initPresentationMode`, `open/closePresentationMode`, `fitPresentationStage`, `resetHudTimer`, `playPresentationSlide`, `togglePresentationPlayPause`, `next/prevPresentationSlide`, `togglePresentationFullscreen` | `PresentationMode`, `Hud`, `usePresentation` |
| `bindEvents` (~775 dòng, 11 `addEventListener`) | bị xóa: mỗi sự kiện thành `onClick`/`onChange` của đúng component; phím tắt vào `useHotkeys` |

---

## 6. Skill / plugin / MCP

| Phase | Skill / plugin |
|---|---|
| F0 Audit & parity | `improve-codebase-architecture`, plugin `feature-dev` (code-explorer, chỉ đọc), `grill-with-docs`, `domain-modeling`, `to-spec`, `to-tickets`, `wayfinder` |
| F1 Scaffold | `codebase-design`, `setup-pre-commit`, `using-git-worktrees` |
| F2 Store/API | `tdd`, `codebase-design`, `diagnosing-bugs` |
| F3 Shell | `frontend-design` (plugin), `ui-styling`, `design-system` |
| F4 Canvas | `tdd`, `diagnosing-bugs`, `wait-what` (khi AI giải thích vòng đời React/GSAP khó hiểu) |
| F5–F8 | `frontend-design`, `ui-styling`, `tdd`, `code-review` |
| F9 Debug | `tdd`, `diagnosing-bugs` |
| F10 Cutover | `code-review`, plugin `pr-review-toolkit`, `finishing-a-development-branch`, `handoff`, `retro`, `writing-for-agents` (cập nhật CLAUDE.md/AGENTS.md) |
| Mọi ticket | `implement`/`implement-spec`, `git-guardrails-claude-code` |

**Lưu ý với `CLAUDE.md` hiện có:** file này yêu cầu luôn gọi skill HyperFrames (`/hyperframes`, `npm run check`…) trước khi sửa **composition**. Việc chuyển FE **không sửa composition**, nên prompt master bên dưới nói rõ: không chạy workflow HyperFrames cho UI, nhưng đầu ra của `sceneToHyperFramesHtml` phải giữ nguyên.

---

## 7. Prompt từng phase

### Master prompt (dán đầu mỗi phiên)

```
Project: "AI Lecture Studio" (repo lam-bui-tech/gen-slide-and-create-video).
Task: migrate the Studio UI from the vanilla-JS single file index.html (4420 lines;
class StudioApp with 57 methods, 139 getElementById ids, 14 scattered fetch calls) to
Next.js 15 (App Router) + TypeScript strict + Zustand, in a new web/ folder, WITHOUT
changing behavior.
Hard rules:
- Strangler migration: keep index.html + server.js working on :3000 until I sign off
  parity; run the new app on :3001.
- templates/, studio/, schemas/ stay where they are and are imported by web/ (no copies).
  Their JS logic (sceneReducer, flow machine, builder, quality, registry, migration,
  renderSlide, buildGsapTimelineForSlide) must not change behavior; existing Python
  tests (pytest) must stay green.
- renderSlide() returns an HTML string shared with the MP4 export path
  (sceneToHyperFramesHtml). Do NOT convert templates to JSX in this migration.
- Do not run HyperFrames composition workflows/skills for UI work (this task does not
  modify compositions), but the generated HyperFrames HTML must remain identical.
- No visual or behavioral improvements; list ideas separately in docs/FE_IDEAS.md.
- Windows environment; commands must work in cmd/PowerShell.
Process per ticket: restate scope + acceptance, Plan Mode, tdd where logic exists,
implement, run web tests + pytest, compare with the legacy UI, commit, report
(files changed, how to run, risks). Ask me when ambiguous. Do not guess.
Ticket now: <PASTE ID>
```

### F0 — Audit, checklist parity, quyết định (chỉ đọc + tài liệu)
Skills: `feature-dev` (code-explorer), `improve-codebase-architecture`, `grill-with-docs`, `domain-modeling`, `to-spec`, `to-tickets`, `wayfinder`

**F0.1 — FE as-is map**
```
Read-only. Produce docs/FE_AS_IS.md. Do not change code.
Analyze index.html (CSS 21-765, body 766-1421, module script 1422-4289, plus modals
after the script ~4292-4420), studio/*.js, templates/index.js, registry.js,
migration.js and server.js. Document:
1) All StudioApp state fields and which methods read/write each one.
2) Every method: purpose, DOM ids touched, API calls, events bound in bindEvents()
   (group the ~775 lines by feature), and its target React module.
3) All 14 fetch calls: endpoint, method, payload, response used, error handling, the
   base-URL variant used (window.API_BASE / apiBase / API_BASE) and the fake projectId
   fallbacks ('demo', 'sample').
4) How renderSlide() output is mounted, which CSS selectors make text editable
   (the long querySelectorAll list in renderCanvas), how image click, GSAP timeline
   setup/teardown, video sync and presentation mode work.
5) What touches window/document at import time in templates/ and studio/ (SSR risk).
6) Whether renderSlide escapes user/AI content (XSS risk when inserted via innerHTML).
7) Duplicate or dead code you notice (e.g. duplicate StaticFiles mounts and imports in
   server/api_service.py; legacy /api/* routes in server.js that the UI never calls).
End with a risk list and what can be reused unchanged.
```

**F0.2 — Quyết định (`grill-with-docs`)**
```
Using docs/FE_AS_IS.md, interview me one group at a time and record ADRs in
docs/adr/0009-frontend-migration.md. Cover: Next.js vs Vite+React; port plan
(:3001 during migration); how web/ imports ../templates and ../studio (externalDir /
path aliases / allowJs); CSS strategy (port the inline <style> as global CSS first,
split into CSS Modules later; Tailwind out of scope); state (Zustand wrapping the
existing sceneReducer); API access (rewrites vs NEXT_PUBLIC_API_BASE, long LLM/TTS
requests and proxy timeout); test stack (Vitest + Testing Library + Playwright);
what "parity" means; whether to keep server.js after cutover.
```

**F0.3 — Parity checklist + e2e trước khi chuyển**
```
Create docs/FE_PARITY.md: a numbered checklist of every user-visible behavior of the
current Studio (new project, template gallery + pack switch, upload doc, clarification
modal, outline review, inline text edit, image replace modal, layout variants, animation
rows, narration edit + synthesize audio, audio-first duration, media strip, video
inspector, slide chat patch apply/discard, pedagogy review, builder mode add block/set
slot/save layout, presentation mode + HUD + fullscreen, PDF/PPTX/MP4 export polling,
undo/redo, autosave indicator, keyboard shortcuts, prev/next slide).
Then write a Playwright suite against the LEGACY UI on :3000 using a mocked backend
(record real responses from a real run as fixtures) covering the golden path and the
items that can be automated. These tests will later run unchanged against :3001.
Also snapshot renderSlide() for all 10 layouts (reuse tests/engine/snapshots).
```

---

### F1 — Scaffold `web/`
```
Create web/ with Next.js 15 (App Router), TypeScript strict, ESLint, Vitest + Testing
Library, Zustand, and gsap pinned to the SAME version the legacy page loads from the CDN
(3.14.2). Use next/font for Be Vietnam Pro and JetBrains Mono.
- next.config.mjs: allow importing ../templates and ../studio (experimental.externalDir
  or equivalent per current Next docs; verify in the docs), rewrites for /projects,
  /exports, /storage, /packs -> BACKEND_URL (default http://localhost:8000), and a proxy
  timeout large enough for LLM/TTS requests (check the correct option in the docs).
- tsconfig path aliases: @engine/* -> ../studio/*, @templates/* -> ../templates/*,
  @schemas/* -> ../schemas/*; allowJs true, checkJs false for now; add minimal .d.ts
  shims for the imported JS modules.
- Scripts: dev (-p 3001), build, lint, test, typecheck. Pre-commit via setup-pre-commit.
- Port tokens.css and templates.css as-is into global styles.
Acceptance: `npm run dev` shows a blank page with correct fonts; a test imports
sceneReducer and renderSlide from the shared modules and runs in Vitest; `pytest` still
green; no change to the legacy UI.
```

### F2 — Types, API client, store
```
Create web/src/lib/api.ts as the ONLY place that calls fetch: typed functions for the 14
call sites found in docs/FE_AS_IS.md, one base-URL rule (relative URLs through the
rewrites), typed ApiError {status, endpoint, body}, and no fake projectId fallbacks
('demo'/'sample'): a missing projectId must be a visible error state.
Types come from schemas/types.ts (Zod) where possible; do not hand-duplicate them.
Create useStudioStore (Zustand) with slices scene/history/ui/flow/exports. dispatch(action,
label) must call the existing sceneReducer, keep the same undo/redo snapshot semantics
and the same action labels used today. Add useAutosave (500 ms debounce, PUT /scene,
saving/saved/error status). Enable zustand devtools with action names.
Use tdd: tests for dispatch/undo/redo/autosave against recorded fixtures; contract test
that api.ts functions match docs/API.md.
```

### F3 — Shell tĩnh (chưa có canvas)
```
Port the layout (navbar, slide navigator, canvas pane frame, props panel frame) as React
components using the ported CSS, reading from the store. Replace renderNavbar,
renderSlideList, renderAll. Slide list supports select, add, duplicate, delete exactly as
today. Load a recorded scene fixture when no project is opened. Component tests for the
slide list and navbar states. Compare screenshots with the legacy UI.
```

### F4 — Canvas + timeline (phần khó nhất, làm cẩn thận)
```
Implement SlideCanvas, useSlideTimeline, TimelineBar.
Design constraints (React-specific traps to handle explicitly):
1) SlideCanvas sets the HTML from renderSlide(slide) into a ref inside useLayoutEffect
   keyed by a hash of the slide content, NOT on every store change, so the caret is not
   lost while typing in contenteditable. Commit edits on blur exactly like the legacy
   code (same UPDATE_SLIDE / UPDATE_ELEMENT actions and labels).
2) Replace per-element handlers with event delegation on the canvas root. Put the long
   editable CSS-selector list into lib/editableSelectors.ts with a comment per selector.
3) GSAP: create the timeline in an effect, kill it in cleanup (gsap.context), and make
   it idempotent under React StrictMode (effects run twice in dev).
4) Keep the 1920x1080 canvas scaled to the frame as today; slider, play/pause/stop,
   progress(1) "finished state" for editing, video time sync.
5) Never use dangerouslySetInnerHTML for user-controlled strings unless the escaping in
   renderSlide is verified (see FE_AS_IS item 6); add a test with HTML/script payloads.
tdd for the pure parts (hash, selector map, time formatting). Acceptance: all 10
layouts render pixel-identical to the legacy canvas (screenshot diff); inline edit, image
click, play/scrub behave like the legacy UI.
```

### F5 — Properties panel
```
Port renderProperties and children: template select, variant grid, narration textarea
with stats, voice panel (audio player, regenerate, audio-first duration), animation rows,
media strip (GET media-recommendations, one-click apply, variant fallback), video
inspector (trim, mute/ducking), slide chat (send, diff, apply/discard). Each as its own
component with props from the store; no direct DOM access. Component tests per panel and
reducer-level tests for the actions they dispatch.
```

### F6 — Luồng và modal
```
Port the flow machine (studio/flow.js) as a hook and every modal into a ModalHost:
gallery (filters), upload + progress, clarification, outline review (uses
studio/outline_editor.js), pedagogy review (studio/quality.js), image modal.
handleDocumentUpload (~200 lines) becomes a sequence of small api.ts calls driven by the
flow machine with explicit loading/error states and a Cancel/Retry path. Playwright test
for pack -> upload -> clarification -> outline -> studio against the mocked backend.
```

### F7 — Builder mode
```
Port builder mode (toggle, add blocks, canvas, drag/resize with snap-to-grid, inspector,
slot/decor role, constraints, animation preset, save to pack). Keep using
studio/builder.js for all draft mutations. Use pointer events with cleanup. Playwright
test: add blocks, mark a slot, save, see the layout in the pack.
```

### F8 — Trình chiếu + export
```
Port presentation mode (stage scaling, HUD auto-hide, audio per slide, fullscreen,
keyboard) as PresentationMode/usePresentation, and export (PDF/PPTX/MP4 start + polling
until done, download link, error state) as useExportPolling. Test the polling state
machine with fake timers.
```

### F9 — Công cụ debug (mục tiêu chính của bạn)
```
Add debugging infrastructure:
- ErrorBoundary around each pane (navigator, canvas, props, each modal) showing the
  error, the slide id and a "copy diagnostics" button.
- Zustand devtools with readable action names; a DebugDrawer enabled by ?debug=1 showing
  current scene JSON, undo/redo stack, last 50 actions, last 20 API requests with
  status, duration and payload size.
- api.ts logs every request/response in development with a request counter and ApiError
  details; no secrets in logs.
- VS Code launch.json for Next (server + browser) and source maps.
- A docs/FE_DEBUGGING.md: how to find where a bug lives (store action -> reducer ->
  renderSlide -> canvas effect), with 5 worked examples from the legacy bugs
  (blank slides, 404 image, stale audio duration, lost caret, duplicate timeline).
tdd for the request log and error boundary.
```

### F10 — Cutover
```
Run the full parity checklist and Playwright suite against :3001. Fix all diffs. Then:
- Update docs (README, CLAUDE.md, AGENTS.md via writing-for-agents): new run commands,
  ports, folder map; remove statements that index.html is the main composition.
- Decide with me what happens to server.js (retire static+proxy, keep only if needed) and
  move index.html to legacy/ for one release instead of deleting it.
- Confirm FastAPI still works standalone, MP4/PDF/PPTX export unaffected (export uses
  per-project generated index.html, not the repo root one), and scripts that spawn
  node (scripts/map_outline_to_scene.mjs) still run.
- Remove the duplicate StaticFiles mounts/imports in server/api_service.py only if
  confirmed safe (separate small PR).
Finish with code-review, pr-review-toolkit, finishing-a-development-branch, handoff.
```

---

## 8. Cổng kiểm tra (gates)

| Gate | Điều kiện |
|---|---|
| G-F0 | `FE_AS_IS.md`, ADR, `FE_PARITY.md`, Playwright chạy xanh trên bản cũ |
| G-F2 | store + api client có test; `pytest` vẫn xanh |
| G-F4 | 10 layout giống bản cũ (diff ảnh), sửa chữ/ảnh/phát timeline đúng |
| G-F6 | luồng pack → upload → outline → studio chạy bằng Playwright |
| G-F10 | toàn bộ checklist parity đạt; export MP4/PDF/PPTX chạy từ UI mới |

Nếu làm hai người sau F4: một người F5 + F6 (panel, modal), người kia F7 + F8 (builder, trình chiếu), mỗi người một worktree.

---

## 9. Rủi ro & điểm cần chốt

1. **Cổng 3000 trùng:** `server.js` mặc định cổng 3000 trùng với Next.js. Giai đoạn chuyển: Next.js ở 3001.
2. **Timeout proxy:** request sinh slot/outline/TTS có thể dài; Next.js dev proxy có timeout mặc định ngắn. Cần chỉnh trong F1 hoặc gọi thẳng backend (CORS backend đang cho phép `*`, nhưng ảnh/`/storage` vẫn cần rewrite vì URL ảnh là đường dẫn tương đối).
3. **Chuỗi HTML của template:** XSS khi gán `innerHTML` nếu `renderSlide` chưa escape nội dung do AI/người dùng sinh. F0.1 mục 6 kiểm tra, F4 có test.
4. **SSR:** `templates/index.js` và `studio/*.js` có thể chạm `window/document` khi import; F0.1 mục 5 kiểm tra, nếu có thì dùng client-only import.
5. **Thư mục gốc không có `package.json`:** `CLAUDE.md` hiện mô tả `npm run dev/check/render` theo mẫu HyperFrames nhưng các script đó không tồn tại ở gốc repo. F10 cập nhật tài liệu cho khớp thực tế.
6. **`index.html` gốc:** export MP4 dùng thư mục project (index.html được sinh theo từng project), không dùng `index.html` gốc, nên chuyển đi vẫn an toàn. Vì vậy mới chuyển vào `legacy/` thay vì xóa ngay.
7. **Mã trùng lặp phía FastAPI** (hai lần mount `/storage`, import lặp trong `server/api_service.py`) và **fallback projectId giả** (`'demo'`, `'sample'`) đều nên dọn, nhưng ở PR riêng để không lẫn với việc chuyển FE.
8. **Chạy đúng mong muốn chưa?** Bạn nói BE chạy được nhưng chưa chắc đúng mục đích. Kế hoạch này chỉ giữ nguyên hành vi. Phần "đúng mục đích" (template-first, gợi ý media…) vẫn đi theo playbook v2 trước đó, và việc chuyển FE sẽ làm các thay đổi đó dễ làm hơn.
