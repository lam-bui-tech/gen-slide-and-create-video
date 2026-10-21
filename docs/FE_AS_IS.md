# AI Lecture Studio — FE As-Is Architecture & Audit Map (docs/FE_AS_IS.md)

Audit completed: 21/10/2026.
Target repository: `lam-bui-tech/gen-slide-and-create-video`

---

## 1. StudioApp State Fields & Method Read/Write Matrix

In `index.html` (lines 1435–1463), `StudioApp` initializes 22 state fields. Below is the mapping of each field and which methods read/write it:

| State Field | Type & Default | Read by | Written by | Target React / Zustand Slice |
|---|---|---|---|---|
| `scene` | `object \| null` (`null`) | `openGalleryModal`, `saveDraftLayoutToPack`, `triggerAutosave`, `getCurrentSlide`, `setSlideIndex`, `renderNavbar`, `renderSlideList`, `renderCanvas`, `renderProperties`, `renderMediaStrip`, `sendSlideChatInstruction`, `bindEvents`, `openPresentationMode`, `playPresentationSlide`, `export*` | `init`, `dispatch`, `createNewEmptyProject`, `handleDocumentUpload` (after outline generation) | `sceneSlice` (Zustand) |
| `currentSlideIndex` | `number` (`0`) | `getCurrentSlide`, `setSlideIndex`, `renderSlideList`, `renderCanvas`, `renderProperties`, `renderMediaStrip`, `sendSlideChatInstruction`, `bindEvents`, `openPresentationMode` | `constructor`, `setSlideIndex`, `dispatch` (ADD_SLIDE/REMOVE_SLIDE auto-adjust), `createNewEmptyProject` | `sceneSlice` / `uiSlice` |
| `history` | `Array<object>` (`[]`) | `undo`, `redo` | `dispatch` (appends deepClone snapshot up to max 30), `init`, `createNewEmptyProject` | `historySlice` |
| `historyIndex` | `number` (`-1`) | `undo`, `redo`, `bindEvents` (undo/redo disabled state) | `dispatch` (points to latest), `undo` (`--`), `redo` (`++`), `init`, `createNewEmptyProject` | `historySlice` |
| `saveTimeout` | `Timer \| null` (`null`) | `triggerAutosave` | `triggerAutosave` (clears and sets debounce 500ms) | `useAutosave` hook |
| `activeImageTargetId` | `string \| null` (`null`) | `bindEvents` (`btn-apply-img`, `btn-media-strip-remove`, etc.) | `renderCanvas` (on image click), `closeImageModal` (reset null) | `uiSlice` |
| `isAudioJobRunning` | `boolean` (`false`) | `renderNavbar` (disables actions if running) | `bindEvents` (set true during TTS fetch, reset false in finally) | `flowSlice` / `uiSlice` |
| `currentTimeline` | `gsap.core.Timeline \| null` | `setupSlideTimeline`, `playSlideTimeline`, `pauseSlideTimeline`, `stopSlideTimeline`, `openPresentationMode` | `setupSlideTimeline` (assigned from `buildGsapTimelineForSlide`), `stopSlideTimeline` | `useSlideTimeline` hook |
| `isPlaying` | `boolean` (`false`) | `bindEvents` (keyboard toggle `Ctrl+Space`), `setupSlideTimeline` | `setupSlideTimeline` (set false on complete), `playSlideTimeline` (true), `pauseSlideTimeline` (false), `stopSlideTimeline` (false) | `useSlideTimeline` hook |
| `flowMachine` | `object` (`createFlowMachine`) | `handleDocumentUpload`, `reviewOutlineModal` | `constructor`, `handleDocumentUpload` (transitions: IDLE -> UPLOADING -> CLARIFYING -> OUTLINE -> GENERATING_SCENE -> STUDIO) | `flowSlice` |
| `selectedGalleryPackId` | `string` (`'basic'`) | `openGalleryModal`, `renderGalleryGrid`, `bindEvents` (`btn-gallery-confirm`) | `constructor`, `openGalleryModal`, `renderGalleryGrid` (on card click) | `uiSlice` |
| `galleryIntent` | `'upload' \| 'switch-pack'` | `openGalleryModal`, `bindEvents` (`btn-gallery-confirm`) | `openGalleryModal` (passed as arg) | `uiSlice` |
| `availablePacks` | `Array<object>` (`[]`) | `openGalleryModal`, `filterGalleryPacks` | `loadAvailablePacks` (fetches `/packs` or fallback `TemplateRegistry.list()`) | `uiSlice` / `api` cache |
| `mode` | `'slide' \| 'builder'` (`'slide'`) | `toggleBuilderMode`, `addBuilderBlock`, `renderAll` | `toggleBuilderMode` | `builderSlice` / `uiSlice` |
| `draftLayout` | `object \| null` (`null`) | `addBuilderBlock`, `renderBuilderCanvas`, `updateInspectorCoords`, `renderBuilderInspector`, `saveDraftLayoutToPack` | `toggleBuilderMode` (`createDraftLayout`), builder operations | `builderSlice` |
| `activeBuilderElementId` | `string \| null` (`null`) | `renderBuilderInspector`, `updateInspectorCoords`, `bindEvents` | `renderBuilderCanvas` (on click block), builder operations | `builderSlice` |
| `pendingChatPatch` | `object \| null` (`null`) | `applySlideChatPatch`, `discardSlideChatPatch` | `sendSlideChatInstruction` (stores server patch response), `applySlideChatPatch` (reset null), `discardSlideChatPatch` (reset null) | `uiSlice` |
| `isPresentationActive` | `boolean` (`false`) | `fitPresentationStage`, `resetHudTimer`, `initPresentationMode` (keyboard handler), `playPresentationSlide` | `openPresentationMode` (true), `closePresentationMode` (false) | `presentationSlice` / `usePresentation` |
| `presentationIndex` | `number` (`0`) | `playPresentationSlide`, `togglePresentationPlayPause`, `nextPresentationSlide`, `prevPresentationSlide`, `closePresentationMode` | `openPresentationMode`, `playPresentationSlide` | `presentationSlice` / `usePresentation` |
| `presentationTimeline` | `gsap.core.Timeline \| null` | `playPresentationSlide`, `togglePresentationPlayPause`, `closePresentationMode` | `playPresentationSlide`, `closePresentationMode` (killed and null) | `usePresentation` hook |
| `presentationAudio` | `HTMLAudioElement \| null` | `playPresentationSlide`, `togglePresentationPlayPause`, `closePresentationMode` | `playPresentationSlide`, `closePresentationMode` (paused and null) | `usePresentation` hook |
| `presentationIsPlaying` | `boolean` (`false`) | `resetHudTimer`, `togglePresentationPlayPause` | `playPresentationSlide` (true/false), `togglePresentationPlayPause` | `presentationSlice` / `usePresentation` |
| `hudHideTimeout` | `Timer \| null` (`null`) | `resetHudTimer` | `resetHudTimer` | `usePresentation` hook |

---

## 2. StudioApp Methods & Feature Mapping

Total methods in `StudioApp`: 48 methods.

### 2.1 Lifecycle & Core State
- `constructor()`: Initializes 22 state fields. -> `web/src/store/useStudioStore.ts`
- `async init()` (lines 2053–2075): Loads mock `initialScene` or reads from project API, sets history, calls `renderAll()`. -> `web/src/app/studio/[projectId]/page.tsx` + store init.
- `dispatch(action, actionName)` (lines 2076–2095): Invokes `sceneReducer(this.scene, action)`, pushes snapshot to `this.history` (max 30), calls `renderAll()` and `triggerAutosave()`. -> `useStudioStore.getState().dispatch(action, label)`.
- `undo()` (lines 2096–2104): Decrements `historyIndex`, sets `this.scene = deepClone(this.history[this.historyIndex])`, calls `renderAll()`, `triggerAutosave()`. -> `useStudioStore.getState().undo()`.
- `redo()` (lines 2105–2113): Increments `historyIndex`, sets `this.scene = deepClone(this.history[this.historyIndex])`, calls `renderAll()`, `triggerAutosave()`. -> `useStudioStore.getState().redo()`.
- `triggerAutosave()` (lines 2114–2139): Debounces 500ms; updates `#save-status` (`saving`), executes `PUT /projects/{projectId}/scene`, updates `#save-status` (`saved` or `error`). -> `web/src/hooks/useAutosave.ts`.
- `getCurrentSlide()` (lines 2140–2144): Returns `this.scene.slides[this.currentSlideIndex]`. -> Store selector `useStudioStore(s => s.scene?.slides[s.currentSlideIndex])`.
- `setSlideIndex(idx)` (lines 2145–2152): Bounds check, updates `currentSlideIndex`, calls `renderAll()`. -> Store action `setSlideIndex(idx)`.
- `createNewEmptyProject(force = false)` (lines 2006–2052): Prompts confirmation if unsaved, creates minimal default scene with 1 title slide, resets history, calls `renderAll()`. -> Store action + `api.createProject`.

### 2.2 Shell & Navigation
- `renderAll()` (lines 2153–2161): Coordinates sub-renders (`renderNavbar`, `renderSlideList`, `renderCanvas` or `renderBuilderCanvas`, `renderProperties`). -> Replaced by reactive React component hierarchy.
- `renderNavbar()` (lines 2162–2179): Updates `#project-title-input`, `#pedagogy-badge`, `#current-pack-label`, undo/redo button enabled states. -> `components/shell/Navbar.tsx`.
- `renderSlideList()` (lines 2180–2276): Populates `#slide-list-container`, highlights active slide thumbnail, binds click (select), duplicate (`btn-dup-slide`), delete (`btn-del-slide`), drag/reorder. -> `components/shell/SlideNavigator.tsx`.

### 2.3 Canvas & GSAP Timeline
- `renderCanvas()` (lines 2277–2342): Injects `canvas.innerHTML = renderSlide(slide, 0, 0)`, attaches `contenteditable` to 12 text selector classes, handles `blur` dispatching `UPDATE_SLIDE` / `UPDATE_ELEMENT`, attaches `img.onclick` to open image modal, calls `setupSlideTimeline()`. -> `components/canvas/SlideCanvas.tsx` + `lib/editableSelectors.ts`.
- `setupSlideTimeline()` (lines 2641–2683): Calls `buildGsapTimelineForSlide(slide, canvas)`, calls `progress(1)` for WYSIWYG editing, binds timeline `onUpdate` to slider & video sync, and `onComplete` to reset play button. -> `hooks/useSlideTimeline.ts`.
- `playSlideTimeline()` (lines 2684–2699): Restarts or plays timeline, plays embedded video. -> `hooks/useSlideTimeline.ts`.
- `pauseSlideTimeline()` (lines 2700–2710): Pauses timeline & embedded video. -> `hooks/useSlideTimeline.ts`.
- `stopSlideTimeline()` (lines 2711–2730): Resets slider, sets timeline `progress(1)` (fully revealed edit state), rewinds video to `trimStart`. -> `hooks/useSlideTimeline.ts`.
- `formatSeconds(s)` (lines 2731–2736): Formats float seconds into `MM:SS.s`. -> `lib/format.ts`.
- `syncVideoTime(time)` (lines 2436–2446): Seeks embedded `<video>` to `trimStart + time`. -> `hooks/useSlideTimeline.ts`.

### 2.4 Properties Panel
- `renderProperties()` (lines 2343–2408): Populates `#prop-template-select`, variant pills (`#variant-pills-container`), narration textarea (`#prop-narration-input`), voice selector, notes, audio player (`#slide-audio-player`), calls `renderVideoInspector`, `renderMediaStrip`, `renderAnimationsList`. -> `components/props/PropsPanel.tsx` and child components.
- `updateNarrationStats(text)` (lines 2525–2535): Computes character count, estimated duration (at 180 wpm Vietnamese standard), updates `#narration-char-count`, `#narration-est-time`. -> `components/props/NarrationBox.tsx`.
- `renderAnimationsList(slide)` (lines 2536–2640): Injects rows into `#anim-list-container` with preset dropdown, delay, duration, delete buttons. -> `components/props/AnimationList.tsx`.
- `renderVideoInspector(slide)` (lines 2409–2435): Shows/hides `#video-component-section`, populates video src, trim start, trim end, volume slider, ducking checkbox. -> `components/props/VideoInspector.tsx`.
- `async renderMediaStrip(slide)` (lines 2447–2524): Fetches `GET /projects/{id}/media-recommendations/{slideId}`, renders 2-column cards, binds 1-click apply. -> `components/props/MediaStrip.tsx`.
- `async sendSlideChatInstruction()` (lines 2749–2835): Posts instruction to `/projects/{id}/slides/{slideId}/chat`, displays visual diff modal/box. -> `components/props/SlideChat.tsx`.
- `applySlideChatPatch()` (lines 2836–2848): Dispatches patch changes, resets `pendingChatPatch`. -> `components/props/SlideChat.tsx`.
- `discardSlideChatPatch()` (lines 2849–2856): Clears `pendingChatPatch` and diff UI. -> `components/props/SlideChat.tsx`.

### 2.5 Modals & Flow Machine
- `async loadAvailablePacks()` (lines 1465–1481): Fetches `GET /packs`, falls back to `TemplateRegistry.list()`. -> `lib/api.ts`.
- `async openGalleryModal(intent)` (lines 1482–1499): Opens `#gallery-step-modal`, loads packs, renders cards. -> `components/modals/GalleryModal.tsx`.
- `closeGalleryModal()` (lines 1500–1504): Closes modal. -> `components/modals/GalleryModal.tsx`.
- `renderGalleryGrid(packs)` (lines 1505–1564): Renders pack selection cards with preview thumbnails. -> `components/modals/GalleryModal.tsx`.
- `filterGalleryPacks()` (lines 1565–1584): Filters packs by search query, subject, style. -> `components/modals/GalleryModal.tsx`.
- `openImageModal(src)` / `closeImageModal()` (lines 2737–2748): Controls `#image-modal` for image replacement/URL input/upload. -> `components/modals/ImageModal.tsx`.
- `openPedagogyModal()` / `closePedagogyModal()` / `updatePedagogyReview()` (lines 2857–2971): Runs `auditDeckQuality(this.scene)`, renders score breakdown & table of issues in `#pedagogy-modal`. -> `components/modals/PedagogyModal.tsx`.
- `async handleDocumentUpload(file)` (lines 3811–4019): Multi-step ingestion workflow:
  1. POST `/projects` -> project created
  2. POST `/projects/{id}/documents` -> extract DocumentContext
  3. GET `/projects/{id}/clarification` -> populates ClarificationModal
  4. User submits clarification -> POST `/projects/{id}/clarification`
  5. POST `/projects/{id}/outline` -> produces outline
  6. Opens `reviewOutlineModal` for teacher editing
  7. PUT `/projects/{id}/outline` -> approve outline
  8. POST `/projects/{id}/scene` -> generates scene
  9. Loads generated scene into Studio -> `components/modals/UploadProgress.tsx`, `ClarificationModal.tsx`, `OutlineReviewModal.tsx`.
- `async reviewOutlineModal(rawOutline)` (lines 1585–1724): Renders editable outline slide cards, handles reorder, add, remove, and layout select. -> `components/modals/OutlineReviewModal.tsx`.

### 2.6 Builder Mode
- `toggleBuilderMode(enable)` (lines 1725–1780): Switches `#studio-canvas-pane` between slide mode and builder mode, initializes `createDraftLayout`. -> `components/builder/BuilderCanvas.tsx`.
- `addBuilderBlock(type)` (lines 1781–1829): Adds text, image, or decor block to draft layout. -> `components/builder/BuilderToolbar.tsx`.
- `renderBuilderCanvas()` (lines 1830–1924): Renders draggable/resizable blocks on grid canvas. -> `components/builder/BuilderCanvas.tsx`.
- `updateInspectorCoords(x, y, w, h)` (lines 1925–1935): Updates coordinate inputs in builder inspector. -> `components/builder/BuilderInspector.tsx`.
- `renderBuilderInspector()` (lines 1936–1966): Updates role (slot vs decor), slot name, constraints, animations in inspector. -> `components/builder/BuilderInspector.tsx`.
- `async saveDraftLayoutToPack()` (lines 1967–2005): Validates draft, calls `POST /packs/{packId}/layouts`, persists to pack. -> `components/builder/BuilderToolbar.tsx`.

### 2.7 Presentation Mode & Export
- `initPresentationMode()` (lines 4021–4069): Binds full-screen buttons, window resize listener, mousemove HUD timer, keydown shortcuts. -> `components/presentation/PresentationMode.tsx` + `hooks/usePresentation.ts`.
- `openPresentationMode()` (lines 4070–4088): Stops canvas timeline, shows fullscreen stage, starts slide 0 (or current). -> `hooks/usePresentation.ts`.
- `closePresentationMode()` (lines 4089–4108): Kills presentation timeline, stops audio, exits fullscreen, syncs `currentSlideIndex`. -> `hooks/usePresentation.ts`.
- `fitPresentationStage()` (lines 4109–4117): Computes 16:9 scale factor based on `window.innerWidth/innerHeight`. -> `hooks/usePresentation.ts`.
- `resetHudTimer()` (lines 4118–4129): Reveals HUD, sets auto-hide timeout (2500ms). -> `hooks/usePresentation.ts`.
- `playPresentationSlide(idx, autoPlay)` (lines 4130–4231): Mounts `renderSlide`, builds GSAP timeline, plays audio if available, auto-advances to next slide on complete. -> `hooks/usePresentation.ts`.
- `togglePresentationPlayPause()` (lines 4232–4258): Toggles play/pause for timeline and audio. -> `hooks/usePresentation.ts`.
- `nextPresentationSlide()` / `prevPresentationSlide()` (lines 4259–4274): Navigates slide sequence. -> `hooks/usePresentation.ts`.
- `togglePresentationFullscreen()` (lines 4275–4288): Triggers `requestFullscreen()` or `exitFullscreen()`. -> `hooks/usePresentation.ts`.
- `async pollExportDownload(exportId, formatName)` (lines 3746–3810): Polls `GET /exports/{exportId}` every 1000ms until `status === 'completed' \| 'failed'`. -> `hooks/useExportPolling.ts`.
- `bindEvents()` (lines 2972–3745): ~775 lines of imperative event listeners. Deleted and replaced with native JSX handlers.

---

## 3. Comprehensive Audit of All 20 API Call Sites

| # | Line in `index.html` | Method | Endpoint URL Pattern | Base URL Used | Fake Fallback Id | Payload | Response Used | Error Handling |
|---|---|---|---|---|---|---|---|---|
| 1 | 1468 | `GET` | `/packs` | `apiBase = window.API_BASE \|\| (port==8000 ? '' : ':8000')` | None | None | `this.availablePacks = await res.json()` | Fallback to `TemplateRegistry.list()` |
| 2 | 1986 | `POST` | `/packs/${packId}/layouts` | `apiBase = window.API_BASE \|\| ':8000'` | None | `{ layout: exportedLayout }` | None (checks `res.ok`) | Throws `Error((res.status): ...)` |
| 3 | 2125 | `PUT` | `/projects/${projectId}/scene` | `API_BASE` | `'sample'` | `JSON.stringify(this.scene)` | Status indicator update | Silent catch with status error class |
| 4 | 2458 | `GET` | `/projects/${projectId}/media-recommendations/${slideId}` | `apiBase` | `'demo'` | None | `candidates = await res.json()` | Fallback to static mock candidates |
| 5 | 2770 | `POST` | `/projects/${projectId}/slides/${slideId}/chat` | `apiBase` | `'demo'` | `{ instruction }` | `result = await res.json()` | Alert error message |
| 6 | 3097 | `POST` | `/projects/${projectId}/slides/${slideId}/audio` | `API_BASE` | `'sample'` | `{ narration, voiceId, provider: 'vieneu' }` | `{ durationSeconds, audioUrl }` | Alert error message, resets button |
| 7 | 3683 | `PUT` | `/projects/${projectId}/scene` | `apiBase` | `'demo'` | `JSON.stringify(this.scene)` | None (save before export) | `.catch(() => {})` silent |
| 8 | 3689 | `POST` | `/projects/${projectId}/export` | `apiBase` | `'demo'` | `{ type: 'mp4' }` | `{ exportId }` | Alert error message |
| 9 | 3705 | `PUT` | `/projects/${projectId}/scene` | `apiBase` | `'demo'` | `JSON.stringify(this.scene)` | None (save before export) | `.catch(() => {})` silent |
| 10 | 3711 | `POST` | `/projects/${projectId}/export` | `apiBase` | `'demo'` | `{ type: 'pdf' }` | `{ exportId }` -> calls `pollExportDownload` | Alert error message |
| 11 | 3727 | `PUT` | `/projects/${projectId}/scene` | `apiBase` | `'demo'` | `JSON.stringify(this.scene)` | None (save before export) | `.catch(() => {})` silent |
| 12 | 3733 | `POST` | `/projects/${projectId}/export` | `apiBase` | `'demo'` | `{ type: 'pptx' }` | `{ exportId }` -> calls `pollExportDownload` | Alert error message |
| 13 | 3767 | `GET` | `/exports/${exportId}` | `apiBase` | None | None | `{ status, downloadUrl, error }` | Interval error counter, alerts after 3 failures |
| 14 | 3831 | `POST` | `/projects` | `API_BASE` | None | `{ title, packId }` | `{ projectId }` | Throws error, shows progress modal error |
| 15 | 3854 | `POST` | `/projects/${projectId}/documents` | `API_BASE` | None | `FormData` (`file`) | `docContext = await res.json()` | Throws error with status & message |
| 16 | 3873 | `GET` | `/projects/${projectId}/clarification` | `API_BASE` | None | None | `{ questions }` | Silently ignores, uses default form values |
| 17 | 3933 | `POST` | `/projects/${projectId}/clarification` | `API_BASE` | None | `{ answers: userAnswers }` | None | Catches error, shows alert |
| 18 | 3948 | `POST` | `/projects/${projectId}/outline` | `API_BASE` | None | None | `outline = await res.json()` | Throws error with status & message |
| 19 | 3968 | `PUT` | `/projects/${projectId}/outline` | `API_BASE` | None | `approvedOutline` | None | Throws error with status & message |
| 20 | 3984 | `POST` | `/projects/${projectId}/scene` | `API_BASE` | None | None | `newScene = await res.json()` | Throws error with status & message |

### Base-URL Inconsistencies & Fix in `web/src/lib/api.ts`:
- Currently 3 different conventions are mixed: `window.API_BASE`, `apiBase`, and top-level `const API_BASE`.
- Fake fallbacks `'demo'` and `'sample'` hide uninitialized project errors and cause silent writes to nonexistent projects.
- In Next.js: All requests will route through Next.js proxy rewrites (`/projects`, `/exports`, `/storage`, `/packs`) or relative URLs `/api/proxy/...`, and a missing `projectId` will throw an explicit `ApiError`.

---

## 4. Canvas Mounting, Editable Selectors, Media & Animations

### 4.1 Mounting Pipeline
1. `renderSlide(slide, startOffset, totalDuration)` generates an HTML string.
2. In `renderCanvas()`, this HTML string is assigned to `canvas.innerHTML`.
3. In `openPresentationMode()` / `playPresentationSlide()`, it is assigned to `stage.innerHTML`.
4. The canvas container `#live-canvas` has CSS `width: 1920px; height: 1080px; position: absolute; transform-origin: top left;`.
5. The container is scaled via CSS transform:
   ```js
   const scale = Math.min(parentWidth / 1920, parentHeight / 1080);
   canvas.style.transform = `scale(${scale})`;
   ```

### 4.2 Editable CSS Selectors (to be preserved in `web/src/lib/editableSelectors.ts`)
The legacy canvas binds inline editing to the following 12 selector classes:
- `.slide-title`: Updates `slide.title` on blur (`UPDATE_SLIDE`).
- `.title-hero-sub`: Updates `slide.subtitle` on blur (`UPDATE_SLIDE`).
- `.concept-quote`: Strips outer quotation marks `“”"` and updates `slide.elements` (`UPDATE_ELEMENT`).
- `.breakdown-title`: Updates element title (`UPDATE_ELEMENT`).
- `.breakdown-body`: Updates element content (`UPDATE_ELEMENT`).
- `.timeline-event-title`: Updates timeline event title.
- `.timeline-event-desc`: Updates timeline event description.
- `.formula-display-box`: Updates math formula text.
- `.formula-note-text`: Updates formula explanatory note.
- `.question-txt`: Updates quiz question text.
- `.quiz-opt-text`: Updates quiz option item text.
- `.objective-text`: Updates learning objective list items.
- `.summary-bullet-text`: Updates summary bullet points.

### 4.3 Images & Video Handling
- Images inside canvas (`canvas.querySelectorAll('img')`) receive `class="editable-image"`. Clicking an image records `this.activeImageTargetId = img.id` and triggers `openImageModal(img.src)`.
- Videos rendered via `renderMediaBlock` include data attributes: `data-start`, `data-duration`, `data-media-start`, `data-media-end`, `data-volume`, `data-ducking`.
- `syncVideoTime(time)` queries `#live-canvas video` and syncs `video.currentTime = dataMediaStart + time`.

### 4.4 GSAP Timeline Setup & Cleanup
- `buildGsapTimelineForSlide(slide, containerEl)` creates a `gsap.timeline({ paused: true })`.
- Targets are resolved within `containerEl` for each animation entry.
- Once created, Studio calls `.progress(1)` to render the slide in its final visual layout for direct editing.
- React trap to avoid in Next.js: GSAP timeline instances must be scoped with `gsap.context()` inside `useEffect`/`useLayoutEffect` and cleaned up with `.revert()` to prevent memory leaks and duplicate timeline instances when React StrictMode runs effects twice.

---

## 5. SSR & Browser Globals Audit in Shared Modules

- `templates/tokens.css` & `templates/templates.css`: Pure CSS, 0 JS runtime dependencies.
- `studio/reducer.js`: Pure ES module. 0 references to `window`, `document`, or DOM APIs. Completely safe for SSR.
- `studio/flow.js`: Pure state machine factory. 0 DOM references. Safe for SSR.
- `studio/builder.js`: Pure mathematical and data structure manipulation (`snapToGrid`, block coordinates, layout schemas). 0 DOM references. Safe for SSR.
- `studio/quality.js`: Pure algorithmic deck auditing (`auditDeckQuality`). 0 DOM references. Safe for SSR.
- `studio/outline_editor.js`: Pure data manipulation on outline structures. 0 DOM references. Safe for SSR.
- `templates/registry.js`: Pure class maintaining in-memory template definitions. 0 DOM references. Safe for SSR.
- `templates/migration.js`: Pure data transformer. Line 96 contains `'source': 'document'`, which is a string identifier, NOT the browser `document` object. Safe for SSR.
- `templates/index.js`:
  - `renderSlide`: Pure string templating. Safe on server and client.
  - `buildGsapTimelineForSlide(slide, containerEl)`: Requires `gsap` (or window.gsap) and DOM element `containerEl`. Must only be called on the client inside effects.

**Conclusion:** All shared modules in `templates/` and `studio/` are 100% safe to import in Next.js without SSR crashes, provided `buildGsapTimelineForSlide` is invoked inside client hooks.

---

## 6. HTML Escaping & XSS Security Audit

In `templates/index.js`:
- `escapeHtml(str)` (lines 574–582) escapes `&`, `<`, `>`, `"`, and `'`.
- `formatSlotText(str, placeholder)` (lines 587–592) calls `escapeHtml`.
- All template renderers (`renderTitleSlide`, `renderLearningObjectives`, `renderConceptExplain`, `renderBulletBreakdown`, `renderImageExplain`, `renderComparison`, `renderTimeline`, `renderFormulaExplain`, `renderQuiz`, `renderSummary`) wrap user and AI strings in `escapeHtml(...)`.
- `renderMediaBlock` escapes video source, poster, image src, and alt text.
- Embedded attributes (`id`, `data-*`) are sanitized.

**Conclusion:** `renderSlide` is properly escaped against basic XSS. In React `SlideCanvas`, injecting `innerHTML` via ref within a sanitized boundary is safe, but input text in `contenteditable` should continue to be normalized on blur before dispatching actions.

---

## 7. Dead & Duplicate Code Audit

1. **`server/api_service.py` duplicate mounts and imports:**
   - Line 45: `from fastapi.staticfiles import StaticFiles`
   - Line 125: `from fastapi.staticfiles import StaticFiles`
   - Line 127: `app.mount("/storage", StaticFiles(directory=storage_root), name="storage")`
   - Line 1017: `from fastapi.staticfiles import StaticFiles`
   - Line 1019: `app.mount("/storage", StaticFiles(directory=storage_root), name="storage")` (mounts `/storage` a second time!).
   - Line 1012: `from scripts.export_service import ExportService` imported halfway through file.
2. **`server.js` legacy unused routes:**
   - `GET /api/lecture` and `POST /api/lecture`: Legacy v1 route, never called by `index.html`.
   - `POST /api/upload-pptx`: Legacy v1 route, never called by `index.html`.
   - `GET /api/images` and `POST /api/upload-image`: Legacy v1 routes, never called by `index.html`.
   - Only proxying `/projects`, `/exports`, `/storage`, and serving static assets are actually used.
3. **Fake fallback project IDs in `index.html`:**
   - 7 instances of `this.scene.projectId || 'demo'` or `|| 'sample'`.
   - In Next.js, these will be eliminated: if `projectId` is missing, the UI will display an explicit missing-project state rather than sending corrupted data to a dummy project.

---

## 8. Migration Risks & Reusable Components

### High Risks & Mitigations
1. **Lost Caret on Re-render (React Trap):**
   - *Risk:* In React, re-rendering `SlideCanvas` while user types in `contenteditable` loses cursor focus and position.
   - *Mitigation:* `SlideCanvas` will only update DOM from `renderSlide(slide)` when the slide ID or template layout changes, using a content hash or key. Inline edits update local DOM and commit to store on `blur`.
2. **GSAP StrictMode Duplication:**
   - *Risk:* React 15/18/19 mounts effects twice in development, which can instantiate duplicate GSAP timelines fighting for the same DOM nodes.
   - *Mitigation:* Wrap timeline creation in `gsap.context((self) => { ... }, containerRef)` and kill in cleanup.
3. **Large LLM / TTS Proxy Timeout:**
   - *Risk:* Next.js dev server proxy can time out during 30s+ document ingestion or TTS audio synthesis.
   - *Mitigation:* Configure `proxyTimeout: 300000` (5 minutes) in `next.config.mjs` or route direct API calls with CORS headers.

### Modules 100% Reusable Without Modification
- `studio/reducer.js` (State transitions, action types, validators)
- `studio/flow.js` (Flow machine)
- `studio/builder.js` (Draft builder logic, snapToGrid)
- `studio/quality.js` (Pedagogical quality auditor)
- `studio/outline_editor.js` (Outline CRUD)
- `templates/index.js` (`renderSlide`, `buildGsapTimelineForSlide`)
- `templates/registry.js` (Template registry)
- `templates/migration.js` (Scene v1 to v2 migration)
- `templates/tokens.css` & `templates/templates.css` (Visual styling tokens)
